import json
import logging
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

log = logging.getLogger(__name__)


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
        """Return the first window (≈ 1.0 s of the signal)."""
        return self.get_signal_window(
            dataset_id,
            signal_name,
            start_time_us=0,
            duration_us=1_000_000,
        )

    def get_signal_window(
        self,
        dataset_id: int,
        signal_name: str,
        start_time_us: int = 0,
        duration_us: int = 1_000_000,
    ) -> PatchSignalRecord | None:
        """Stream a time-based window of a single signal.

        Parameters
        ----------
        dataset_id : int
            Target dataset.
        signal_name : str
            Display name or source field of the signal.
        start_time_us : int
            Start timestamp in microseconds (TsECG-relative). The window
            begins at the first sample whose packet covers this time.
        duration_us : int
            Duration of the window in microseconds (wall-clock time).

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

        # ── Instrumentation ──────────────────────────────────────────
        log.info("[PROVIDER REQUEST]\ndataset_id=%s\nsignal=%s\nstart_time_us=%s\nduration_us=%s",
                 dataset_id, signal_name, start_time_us, duration_us)

        # ── Stream ───────────────────────────────────────────────────

        global_idx = 0
        samples: list[float | None] = []
        total_packets = 0
        packets_in_window = 0
        boundaries: list[PacketBoundary] = []
        window_active = False

        first_ts_ecg: int | None = None
        last_ts_ecg: int | None = None
        first_epoch: int | None = None
        last_epoch: int | None = None
        first_seq: int | None = None
        last_seq: int | None = None

        # For sampling-rate estimation: collect a few TsECG differences
        rate_accumulator: list[tuple[int, int]] = []  # [(sample_count, delta_us)]
        prev_ts_ecg: int | None = None

        # Estimated samples-per-second (from chip or derived)
        estimates_sps: float | None = None
        us_per_sample: float = 0.0
        packet_duration_us: float = 0.0

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
                    chip_sps = record.get("sps")
                    if chip_sps:
                        estimates_sps = float(chip_sps)

                    field_data = record.get(source_field)
                    if not isinstance(field_data, list):
                        field_data = []

                    n = len(field_data)

                    # Track the first data packet so we can translate
                    # relative start_time_us → absolute TsECG time.
                    if n > 0 and first_ts_ecg is None:
                        first_ts_ecg = packet_ts_ecg
                        first_epoch = packet_epoch
                        first_seq = packet_seq
                        log.info("[FIRST DATA PACKET]\nfirst_ts_ecg=%s\nfirst_epoch_us=%s",
                                 packet_ts_ecg, packet_epoch)

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

                    # Compute per-sample timing
                    sps = estimates_sps or 0
                    us_per_sample = 1_000_000 / sps if sps > 0 else 0
                    packet_duration_us = n * us_per_sample if us_per_sample > 0 else 0
                    packet_end_time = packet_ts_ecg + packet_duration_us if us_per_sample > 0 else 0

                    # ── First-five-packet debug ──────────────────────────
                    if total_packets <= 5:
                        log.info("PACKET %d: Seq=%s TsECG=%s TsEPOCH=%s field_len=%d sps=%s "
                                 "us_per_sample=%s pkt_dur_us=%s pkt_end_time=%s",
                                 total_packets, packet_seq, packet_ts_ecg, packet_epoch,
                                 n, estimates_sps, us_per_sample, packet_duration_us, packet_end_time)

                    # ── Time-based window activation ────────────────
                    if not window_active:
                        # first_ts_ecg is the absolute TsECG of the FIRST
                        # data packet, captured before any window logic runs.
                        # The frontend's start_time_us is relative to that
                        # first-packet timestamp, so:
                        window_start_ts = (first_ts_ecg or 0) + start_time_us
                        window_end_ts = window_start_ts + duration_us
                        log.info("REQ start_time_us=%s  first_ts_ecg=%s  window_start_ts=%s  window_end_ts=%s",
                                 start_time_us, first_ts_ecg, window_start_ts, window_end_ts)

                        if n > 0 and packet_ts_ecg + packet_duration_us > window_start_ts:
                            # This packet overlaps (or starts exactly at) the requested window start
                            window_active = True

                            # Correct offset formula (relative elapsed):
                            # how many samples into THIS packet is window_start_ts?
                            if sps > 0 and window_start_ts > packet_ts_ecg:
                                sample_offset = int(
                                    (window_start_ts - packet_ts_ecg) * sps / 1_000_000
                                )
                                sample_offset = max(0, min(sample_offset, n - 1))
                                ws = sample_offset
                            else:
                                ws = 0

                            log.info("  >>> ACTIVATED on packet %d (Seq=%s): pkt_ts=%s pkt_end=%s > win_start=%s  → ws=%d",
                                     total_packets, packet_seq, packet_ts_ecg,
                                     packet_ts_ecg + packet_duration_us,
                                     window_start_ts, ws)

                            we = n
                            chunk = field_data[ws:we]
                            log.info("copying packet[%s:%s]", ws, we)
                            boundary_offset = global_idx + ws

                            for v in chunk:
                                if self._is_sentinel(v):
                                    samples.append(None)
                                elif isinstance(v, (int, float)):
                                    samples.append(self._apply_scale(float(v), scale))
                                else:
                                    samples.append(None)

                            boundaries.append(PacketBoundary(
                                seq=packet_seq,
                                ts_ecg=packet_ts_ecg,
                                ts_epoch_us=packet_epoch,
                                sample_offset_start=boundary_offset,
                                sample_count=we - ws,
                            ))

                            if packets_in_window == 0:
                                # first_ts_ecg was already set from the very first
                                # data packet encountered before any window logic.
                                pass
                            last_ts_ecg = packet_ts_ecg
                            last_epoch = packet_epoch
                            last_seq = packet_seq
                            packets_in_window += 1
                        elif n == 0:
                            log.info("  SKIP packet %d: empty signal field", total_packets)
                        else:
                            log.info("  SKIP packet %d (Seq=%s): pkt_end=%s ≤ win_start=%s",
                                     total_packets, packet_seq,
                                     packet_ts_ecg + packet_duration_us,
                                     window_start_ts)

                    elif window_active:
                        # Within active window — use relative time from
                        # first_ts_ecg so the comparison works correctly
                        # regardless of how large the absolute TsECG values are.
                        elapsed_since_start = (packet_ts_ecg - first_ts_ecg) if first_ts_ecg is not None else 0
                        log.info("  ACTIVE: packet %d TsECG=%s  rel_elapsed=%s < dur=%s ? %s  n=%s",
                                 total_packets, packet_ts_ecg,
                                 elapsed_since_start, duration_us,
                                 elapsed_since_start < duration_us, n)
                        if elapsed_since_start < duration_us and n > 0:
                            for v in field_data:
                                if self._is_sentinel(v):
                                    samples.append(None)
                                elif isinstance(v, (int, float)):
                                    samples.append(self._apply_scale(float(v), scale))
                                else:
                                    samples.append(None)
                            log.info("copying packet[0:%s]", n)

                            boundaries.append(PacketBoundary(
                                seq=packet_seq,
                                ts_ecg=packet_ts_ecg,
                                ts_epoch_us=packet_epoch,
                                sample_offset_start=global_idx,
                                sample_count=n,
                            ))

                            last_ts_ecg = packet_ts_ecg
                            last_epoch = packet_epoch
                            last_seq = packet_seq
                            packets_in_window += 1

                    global_idx += n

                    # Stop when relative elapsed time exceeds the requested window
                    if window_active and first_ts_ecg is not None and (packet_ts_ecg - first_ts_ecg) >= duration_us:
                        log.info("  STOP: packet %d TsECG=%s rel_elapsed=%s >= dur=%s  — collected %d samples",
                                 total_packets, packet_ts_ecg,
                                 packet_ts_ecg - first_ts_ecg, duration_us, len(samples))
                        break
        except Exception:
            log.error("Exception during stream", exc_info=True)
            return None

        log.info("RESULT: collected %d samples from %d packets (total=%d)",
                 len(samples), packets_in_window, total_packets)
        log.info("  first_ts_ecg=%s last_ts_ecg=%s boundaries=%d",
                 first_ts_ecg, last_ts_ecg, len(boundaries))
        first10 = samples[:10]
        log.info("  first10_samples=%s", first10)

        if sps > 0:
            log.info(
                "desired_samples=%s actual_samples=%s remaining_samples=%s",
                int(duration_us * sps / 1_000_000),
                len(samples),
                max(0, int(duration_us * sps / 1_000_000) - len(samples)),
            )
        else:
            log.info("desired_samples=N/A actual_samples=%s remaining_samples=N/A", len(samples))

        log.info("[PROVIDER RESULT]\nsamples=%d\npackets_in_window=%d",
                 len(samples), packets_in_window)
        log.info("first10_samples=%s", samples[:10])


        # Estimate sampling rate from accumulated data
        sampling_rate_hz: float | None = None
        if rate_accumulator:
            total_samples = sum(r[0] for r in rate_accumulator)
            total_us = sum(r[1] for r in rate_accumulator)
            if total_us > 0:
                sampling_rate_hz = round(total_samples / (total_us / 1_000_000), 2)

        # Compute actual duration from first/last packet timestamps
        actual_duration_us: int | None = None
        if first_ts_ecg is not None and last_ts_ecg is not None:
            actual_duration_us = last_ts_ecg - first_ts_ecg
            # Add the last packet's remaining duration
            if us_per_sample > 0 and boundaries:
                last_pkt = boundaries[-1]
                actual_duration_us += int(last_pkt.sample_count * us_per_sample)
            if actual_duration_us is not None and actual_duration_us < 0:
                actual_duration_us = None

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
            start_sample=0,
            end_sample=len(samples),
            start_packet_seq=first_seq,
            end_packet_seq=last_seq,
            start_ts_ecg=first_ts_ecg,
            end_ts_ecg=last_ts_ecg,
            start_epoch_us=first_epoch,
            end_epoch_us=last_epoch,
            duration_us=actual_duration_us,
            packet_boundaries=boundaries,
            continuous=True,
            record_info=PatchRecordInfo(
                total_packets=pm.total_packets,
                total_samples=None,
                packets_in_window=packets_in_window if packets_in_window > 0 else None,
            ),
            recording_start_time_us=pm.recording_start_time_us,
            recording_end_time_us=pm.recording_end_time_us,
            recording_duration_us=pm.recording_duration_us,
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
