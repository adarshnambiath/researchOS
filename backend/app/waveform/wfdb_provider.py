import os

from app.repositories.dataset_repository import DatasetRepository
from app.schemas.dataset import DatasetMetadata
from app.waveform.models import WaveformListItem, WaveformRecord
from app.waveform.provider import WaveformProvider


class WFDBWaveformProvider(WaveformProvider):
    """Provider that reads waveform data from WFDB datasets.

    Uses the wfdb library to read records annotated in dataset metadata.
    Each .hea/.dat pair discovered during registration becomes a
    selectable waveform (record) in the viewer.
    """

    PREVIEW_SECONDS = 10

    def __init__(self, repo: DatasetRepository) -> None:
        self._repo = repo

    def _get_metadata(self, dataset_id: int) -> DatasetMetadata | None:
        db_obj = self._repo.get_by_id(dataset_id)
        if not db_obj:
            return None
        return DatasetMetadata.from_schema_json(db_obj.schema_json)

    def _get_source_path(self, dataset_id: int) -> str | None:
        db_obj = self._repo.get_by_id(dataset_id)
        if not db_obj:
            return None
        return db_obj.source_path

    def list_waveforms(self, dataset_id: int) -> list[WaveformListItem]:
        metadata = self._get_metadata(dataset_id)
        if not metadata or not metadata.wfdb or not metadata.wfdb.records:
            return []

        items: list[WaveformListItem] = []
        for rec in metadata.wfdb.records:
            sr = rec.sampling_rate
            items.append(
                WaveformListItem(
                    name=rec.record_name,
                    sampling_rate_hz=sr,
                    units=(
                        rec.signal_units[0] if rec.signal_units else None
                    ),
                    start_column=rec.record_name,
                    end_column=rec.record_name,
                )
            )
        return items

    def _read_wfdb_record(
        self,
        source_dir: str,
        record_name: str,
        start_sample: int = 0,
        num_samples: int | None = None,
    ) -> WaveformRecord | None:
        try:
            import wfdb
        except ModuleNotFoundError as exc:
            raise RuntimeError(
                "The 'wfdb' package is required for ECG (WFDB) waveforms. "
                "Install it with: pip install wfdb>=4.0.0"
            ) from exc

        hea_path = os.path.join(source_dir, record_name)
        if not os.path.isfile(hea_path + ".hea"):
            return None

        try:
            record = wfdb.rdrecord(
                hea_path,
                sampfrom=start_sample,
                sampto=(
                    start_sample + num_samples
                    if num_samples is not None
                    else None
                ),
            )
        except Exception:
            return None

        sig = record.p_signal  # shape (num_samples, num_channels)
        if sig is None or sig.size == 0:
            return None

        num_channels: int = record.n_sig
        sig_names: list[str] | None = record.sig_name
        sig_units: list[str] | None = record.units

        all_channels = [sig[:, ch].tolist() for ch in range(num_channels)]

        result = WaveformRecord(
            waveform_name=record_name,
            record_id=record_name,
            sampling_rate_hz=float(record.fs) if record.fs else None,
            units=sig_units[0] if sig_units else None,
            samples=all_channels[0],
            channel_names=list(sig_names) if sig_names else None,
            channel_units=list(sig_units) if sig_units else None,
            all_channels=all_channels,
        )
        return result

    def get_preview(
        self, dataset_id: int, waveform_name: str
    ) -> WaveformRecord | None:
        metadata = self._get_metadata(dataset_id)
        if not metadata or not metadata.wfdb or not metadata.wfdb.records:
            return None

        # Find the matching record in metadata
        rec_meta = next(
            (r for r in metadata.wfdb.records if r.record_name == waveform_name),
            None,
        )
        if not rec_meta:
            return None

        source_dir = self._get_source_path(dataset_id)
        if not source_dir or not os.path.isdir(source_dir):
            return None

        sr = rec_meta.sampling_rate or 360
        num_samples = int(sr * self.PREVIEW_SECONDS)

        return self._read_wfdb_record(
            source_dir, waveform_name, start_sample=0, num_samples=num_samples,
        )

    def get_record(
        self,
        dataset_id: int,
        waveform_name: str,
        record_id: str,
        start_sample: int = 0,
        num_samples: int | None = None,
    ) -> WaveformRecord | None:
        metadata = self._get_metadata(dataset_id)
        if not metadata or not metadata.wfdb or not metadata.wfdb.records:
            return None

        # Validate the record exists in metadata
        rec_meta = next(
            (r for r in metadata.wfdb.records if r.record_name == record_id),
            None,
        )
        if not rec_meta:
            return None

        source_dir = self._get_source_path(dataset_id)
        if not source_dir or not os.path.isdir(source_dir):
            return None

        return self._read_wfdb_record(
            source_dir, record_id,
            start_sample=start_sample, num_samples=num_samples,
        )
