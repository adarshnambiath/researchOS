import json
import os
from typing import Any

from app.models.dataset import Dataset
from app.repositories.dataset_repository import DatasetRepository
from app.schemas.patch import PatchMetadata
from app.patch.models import (
    PacketBoundary,
    PatchSignalInfo,
    PatchSignalRecord,
    PatchRecordInfo,
)

# Sentinel values that mean "no valid reading"
SENTINEL_VALUES = {-3, 255, 127, 32767}


class PatchProvider:
    """Streams patch signal data from spout.json without loading the
    entire dataset into memory.

    This provider is *packet-aware*: it tracks TsECG, TsEPOCH_US, and
    Seq per packet, reports packet boundaries in the response, and
    converts raw ADC values to engineering units using the scaling
    definitions stored during registration.

    Responsibilities:
    - resolve the dataset source path
    - enumerate signal definitions from metadata
    - stream a single signal field across a sample window
    - report timing & packet metadata so the frontend can build
      meaningful time axes
    """

    def __init__(self, repo: DatasetRepository) -> None:
        self._repo = repo

    def _get_dataset(self, dataset_id: int) -> Dataset | None:
        return self._repo.get_by_id(dataset_id)

    def _get_spout_path(self, dataset_id: int) -> str | None:
        ds = self._get_dataset(dataset_id)
        if not ds or not ds.source_path or not os.path.isdir(ds.source_path):
            return None
        return os.path.join(ds.source_path, "spout.json")

    def _get_patch_metadata(self, dataset_id: int) -> PatchMetadata | None:
        ds = self._get_dataset(dataset_id)
        if not ds or not ds.schema_json:
            return None
        return PatchMetadata.from_schema_json(ds.schema_json)

    # ── Scaling lookup ───────────────────────────────────────────────

    @staticmethod
    def _build_scaling_map(pm: PatchMetadata) -> dict[str, tuple[int, int] | None]:
        """Return {source_field: (numerator, denominator)} or None if unknown."""
        m: dict[str, tuple[int, int] | None] = {}
        for sig in pm.signals:
            m[sig.source_field] = None
        for sc in pm.scaling_definitions:
            for sig in pm.signals:
                if sc.signal_name == sig.display_name or sc.signal_name == sig.source_field:
                    m[sig.source_field] = (sc.numerator, sc.denominator)
                    break
        return m

    @staticmethod
    def _apply_scale(value: int | float, scale: tuple[int, int] | None) -> float:
        if scale is None:
            return float(value)
        num, den = scale
        if den == 0:
            return float(value)
        return float(value) * num / den

    # ── Sentinel detection ───────────────────────────────────────────

    @staticmethod
    def _is_sentinel(value: Any) -> bool:
        """Return True if value is a known no-data marker."""
        if isinstance(value, int) and value in SENTINEL_VALUES:
            return True
        if value is None:
            return True
        if isinstance(value, float) and value in SENTINEL_VALUES:
            return True
        return False

    # ── public API ────────────────────────────────────────────────────

    def list_signals(self, dataset_id: int) -> list[PatchSignalInfo]:
        """Return all registered signal definitions with enriched metadata.

        No file I/O required — data comes from PatchMetadata stored
        during registration.
        """
        pm = self._get_patch_metadata(dataset_id)
        if not pm:
            return []

        # Enrich with scaling units from sensor_lib_info.txt outparams
        for sc in pm.scaling_definitions:
            for sig in pm.signals:
                if sc.signal_name == sig.display_name or sc.signal_name == sig.source_field:
                    sig.units = sig.units or sc.engineering_unit

        return [
            PatchSignalInfo(
                signal_name=sig.display_name,
                units=sig.units,
                scale_factor=sig.scale_factor,
                source_field=sig.source_field,
                enabled=sig.enabled,
            )
            for sig in pm.signals
        ]

    def get_signal_preview(self, dataset_id: int, signal_name: str) -> PatchSignalRecord | None:
        """Return the first window (≈ 1.5 s of the signal)."""
        return self.get_signal_window(
            dataset_id,
            signal_name,
            start_sample=0,
            max_samples=500,
        )

    def get_signal_window(
        self,
        dataset_id: int,
        signal_name: str,
        start_sample: int = 0,
        max_samples: int = 500,
    ) -> PatchSignalRecord | None:
        """Stream only the requested slice of a single signal.

        Parameters
        ----------
        dataset_id : int
            Target dataset.
        signal_name : str
            Display name or source field of the signal.
        start_sample : int
            Zero-based global sample offset for this signal across all
            packets in spout.json.
        max_samples : int
            Maximum number of samples to return.

        Returns
        -------
        PatchSignalRecord | None
            Windowed slice with per-packet timing and packet boundary metadata.
        """
        spout_path = self._get_spout_path(dataset_id)
        if not spout_path:
            return None

        pm = self._get_patch_metadata(dataset_id)
        if not pm:
            return None

        source_field = self._resolve_source_field(pm, signal_name)
        if not source_field:
            return None

        info = self._find_signal_info(pm, source_field)
        scaling_map = self._build_scaling_map(pm)
        scale = scaling_map.get(source_field)

        # ── Stream ───────────────────────────────────────────────────

        window_end = start_sample + max_samples
        global_idx = 0
        samples: list[float | None] = []
        total_packets = 0
        packets_in_window = 0
        boundaries: list[PacketBoundary] = []

        first_ts_ecg: int | None = None
        last_ts_ecg: int | None = None
        first_epoch: int | None = None
        last_epoch: int | None = None
        first_seq: int | None = None
        last_seq: int | None = None

        # For sampling-rate estimation: collect a few TsECG differences
        rate_accumulator: list[tuple[int, int]] = []  # [(sample_count, delta_us)]
        prev_ts_ecg: int | None = None

        try:
            with open(spout_path, "r", encoding="utf-8", errors="replace") as fh:
                for line in fh:
                    if not line.strip():
                        continue
                    try:
                        record = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    total_packets += 1
                    packet_seq = record.get("Seq", total_packets)
                    packet_ts_ecg = record.get("TsECG", 0)
                    packet_epoch = record.get("TsEPOCH_US", 0)

                    field_data = record.get(source_field)
                    if not isinstance(field_data, list):
                        field_data = []

                    n = len(field_data)
                    packet_start = global_idx
                    packet_end = global_idx + n

                    # Accumulate rate data from up to 10 pairs
                    if n > 1 and prev_ts_ecg is not None and prev_ts_ecg != packet_ts_ecg:
                        delta_us = packet_ts_ecg - prev_ts_ecg
                        if delta_us > 0 and delta_us < 10_000_000:  # sanity < 10s
                            rate_accumulator.append((n, delta_us))
                            if len(rate_accumulator) > 10:
                                rate_accumulator.pop(0)
                    if n > 0:
                        prev_ts_ecg = packet_ts_ecg

                    # Check overlap with window
                    if packet_end > start_sample and global_idx < window_end:
                        # Overlaps — extract slice
                        os0 = max(packet_start, start_sample)
                        oe = min(packet_end, window_end)
                        if os0 < oe:
                            ws = os0 - packet_start
                            we = oe - packet_start
                            chunk = field_data[ws:we]

                            # Convert: scale + filter sentinels
                            for v in chunk:
                                if self._is_sentinel(v):
                                    samples.append(None)
                                elif isinstance(v, (int, float)):
                                    samples.append(self._apply_scale(float(v), scale))
                                else:
                                    samples.append(None)

                            # Record packet boundary metadata
                            if ws == 0 and we == n:
                                # Full packet included
                                boundaries.append(PacketBoundary(
                                    seq=packet_seq,
                                    ts_ecg=packet_ts_ecg,
                                    ts_epoch_us=packet_epoch,
                                    sample_offset_start=packet_start,
                                    sample_count=n,
                                ))
                            elif ws >= 0:
                                # Partial packet at window edge — still record it
                                boundaries.append(PacketBoundary(
                                    seq=packet_seq,
                                    ts_ecg=packet_ts_ecg,
                                    ts_epoch_us=packet_epoch,
                                    sample_offset_start=global_idx + ws,
                                    sample_count=we - ws,
                                ))

                            if packets_in_window == 0:
                                first_ts_ecg = packet_ts_ecg
                                first_epoch = packet_epoch
                                first_seq = packet_seq
                            last_ts_ecg = packet_ts_ecg
                            last_epoch = packet_epoch
                            last_seq = packet_seq

                            packets_in_window += 1

                    global_idx += n

                    if len(samples) >= max_samples and global_idx >= window_end:
                        break
        except Exception:
            return None

        # Truncate to requested window
        samples = samples[:max_samples]

        # Estimate sampling rate from accumulated data
        sampling_rate_hz: float | None = None
        if rate_accumulator:
            total_samples = sum(r[0] for r in rate_accumulator)
            total_us = sum(r[1] for r in rate_accumulator)
            if total_us > 0:
                sampling_rate_hz = round(total_samples / (total_us / 1_000_000), 2)

        duration_us: int | None = None
        if first_ts_ecg is not None and last_ts_ecg is not None:
            duration_us = last_ts_ecg - first_ts_ecg
            if duration_us is not None and duration_us < 0:
                duration_us = None

        patch_record = PatchSignalRecord(
            signal_info=PatchSignalInfo(
                signal_name=info.display_name if info else source_field,
                units=info.units if info else None,
                scale_factor=info.scale_factor if info else None,
                source_field=source_field,
                enabled=info.enabled if info else True,
            ),
            samples=samples,
            sampling_rate_hz=sampling_rate_hz,
            start_sample=start_sample,
            end_sample=start_sample + len(samples),
            start_packet_seq=first_seq,
            end_packet_seq=last_seq,
            start_ts_ecg=first_ts_ecg,
            end_ts_ecg=last_ts_ecg,
            start_epoch_us=first_epoch,
            end_epoch_us=last_epoch,
            duration_us=duration_us,
            packet_boundaries=boundaries,
            continuous=True,
            record_info=PatchRecordInfo(
                total_packets=total_packets,
                total_samples=None,
                packets_in_window=packets_in_window if packets_in_window > 0 else None,
            ),
        )
        return patch_record

    # ── helpers ──────────────────────────────────────────────────────

    @staticmethod
    def _resolve_source_field(pm: PatchMetadata, signal_name: str) -> str | None:
        for s in pm.signals:
            if s.display_name == signal_name:
                return s.source_field
            if s.source_field == signal_name:
                return s.source_field
        return None

    @staticmethod
    def _find_signal_info(pm: PatchMetadata, source_field: str) -> Any | None:
        for s in pm.signals:
            if s.source_field == source_field:
                return s
        return None
