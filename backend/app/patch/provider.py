import json
import os
from typing import Any

from app.models.dataset import Dataset
from app.repositories.dataset_repository import DatasetRepository
from app.schemas.patch import PatchMetadata
from app.patch.models import PatchSignalInfo, PatchSignalRecord, PatchRecordInfo


class PatchProvider:
    """Streams patch signal data from spout.json without loading the
    entire dataset into memory.

    Responsibilities:
    - resolve the dataset source path
    - enumerate signal definitions from metadata
    - stream a single signal field across a sample window
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
        """Return the first 500 samples of a signal.

        Used by the detail page and initial viewer load.
        """
        return self.get_signal_window(
            dataset_id,
            signal_name,
            start_index=0,
            num_samples=500,
        )

    def get_signal_window(
        self,
        dataset_id: int,
        signal_name: str,
        start_index: int = 0,
        num_samples: int = 500,
    ) -> PatchSignalRecord | None:
        """Stream only the requested slice of a single signal.

        Parameters
        ----------
        dataset_id : int
            Target dataset.
        signal_name : str
            Display name or source field of the signal.
        start_index : int
            Zero-based global sample offset for this signal across all
            packets in spout.json.
        num_samples : int
            Maximum number of samples to return.

        Returns
        -------
        PatchSignalRecord | None
            Windowed slice with per-window metadata.
        """
        spout_path = self._get_spout_path(dataset_id)
        if not spout_path:
            return None

        pm = self._get_patch_metadata(dataset_id)
        if not pm:
            return None

        # Resolve requested signal_name to a source_field
        source_field = self._resolve_source_field(pm, signal_name)
        if not source_field:
            return None

        info = self._find_signal_info(pm, source_field)

        # cached total across a single read pass is useful for metadata
        total_packets = 0
        total_samples = 0
        packets_in_window: int | None = None

        samples: list[float] = []
        global_idx = 0
        window_end = start_index + num_samples

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
                    field_data = record.get(source_field)

                    # Normalise sentinels / missing fields to empty list
                    if not isinstance(field_data, list):
                        field_data = []

                    n = len(field_data)
                    packet_start = global_idx
                    packet_end = global_idx + n
                    total_samples += n

                    # Determine overlap with [start_index, window_end)
                    if packet_end > start_index and global_idx < window_end:
                        overlap_start = max(packet_start, start_index)
                        overlap_end = min(packet_end, window_end)
                        if overlap_start < overlap_end:
                            offset_start = overlap_start - packet_start
                            offset_end = overlap_end - packet_start
                            window = field_data[offset_start:offset_end]
                            for v in window:
                                if isinstance(v, (int, float)):
                                    samples.append(float(v))
                                else:
                                    samples.append(0.0)
                            if packets_in_window is None:
                                packets_in_window = 0
                            packets_in_window += 1

                    global_idx += n

                    # Optimization: once we have enough samples and are past the window, break
                    if len(samples) >= num_samples and global_idx >= window_end:
                        break
        except Exception:
            return None

        units = info.units if info else None
        scale = info.scale_factor if info else None

        return PatchSignalRecord(
            signal_info=PatchSignalInfo(
                signal_name=info.display_name if info else source_field,
                units=units,
                scale_factor=scale,
                source_field=source_field,
                enabled=info.enabled if info else True,
            ),
            samples=samples[:num_samples],
            start_index=start_index,
            end_index=start_index + len(samples),
            record_info=PatchRecordInfo(
                total_packets=total_packets,
                total_samples=total_samples,
                packets_in_window=packets_in_window,
            ),
        )

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
