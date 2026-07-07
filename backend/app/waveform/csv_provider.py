import os

import pandas as pd

from app.models.dataset import Dataset
from app.repositories.dataset_repository import DatasetRepository
from app.schemas.dataset import DatasetMetadata
from app.waveform.models import WaveformListItem, WaveformRecord
from app.waveform.provider import WaveformProvider


class CSVWaveformProvider(WaveformProvider):
    """Provider that reads waveform data from CSV datasets.

    Uses the stored WaveformDefinition inside DatasetMetadata to
    locate column ranges — never guesses which columns contain
    waveform samples.
    """

    def __init__(self, repo: DatasetRepository) -> None:
        self._repo = repo

    def _get_metadata(self, dataset_id: int) -> DatasetMetadata | None:
        db_obj: Dataset | None = self._repo.get_by_id(dataset_id)
        if not db_obj:
            return None
        return DatasetMetadata.from_schema_json(db_obj.schema_json)

    def _get_dataset(self, dataset_id: int) -> Dataset | None:
        return self._repo.get_by_id(dataset_id)

    def _build_record(
        self,
        row: pd.Series,
        waveform_name: str,
        sampling_rate: float | None,
        units: str | None,
        record_id_col: str | None,
        label_col: str | None,
    ) -> WaveformRecord:
        return WaveformRecord(
            waveform_name=waveform_name,
            record_id=str(row.get(record_id_col, "")) if record_id_col else "",
            label=str(row.get(label_col, "")) if label_col else None,
            sampling_rate_hz=sampling_rate,
            units=units,
            samples=[],
        )

    def list_waveforms(self, dataset_id: int) -> list[WaveformListItem]:
        metadata = self._get_metadata(dataset_id)
        if not metadata or not metadata.waveform_definitions:
            return []

        return [
            WaveformListItem(
                name=wd.name,
                sampling_rate_hz=wd.sampling_rate,
                units=wd.units,
                start_column=wd.start_column,
                end_column=wd.end_column,
            )
            for wd in metadata.waveform_definitions
        ]

    def get_preview(self, dataset_id: int, waveform_name: str) -> WaveformRecord | None:
        metadata = self._get_metadata(dataset_id)
        if not metadata or not metadata.waveform_definitions:
            return None

        wd = next((w for w in metadata.waveform_definitions if w.name == waveform_name), None)
        if not wd:
            return None

        ds = self._get_dataset(dataset_id)
        if not ds or not ds.source_path or not os.path.isfile(ds.source_path):
            return None

        df = pd.read_csv(ds.source_path, nrows=1)
        if df.empty:
            return None

        row = df.iloc[0]
        record = self._build_record(
            row, waveform_name, wd.sampling_rate, wd.units,
            ds.sample_id_column, ds.label_column,
        )

        # Extract sample columns from start_column → end_column (inclusive)
        if wd.start_column in df.columns and wd.end_column in df.columns:
            start_loc = df.columns.get_loc(wd.start_column)
            end_loc = df.columns.get_loc(wd.end_column)
            sample_cols = df.columns[start_loc : end_loc + 1]
            record.samples = [float(v) for v in row[sample_cols] if pd.notna(v)]

        return record

    def get_record(
        self, dataset_id: int, waveform_name: str, record_id: str
    ) -> WaveformRecord | None:
        metadata = self._get_metadata(dataset_id)
        if not metadata or not metadata.waveform_definitions:
            return None

        wd = next((w for w in metadata.waveform_definitions if w.name == waveform_name), None)
        if not wd:
            return None

        ds = self._get_dataset(dataset_id)
        if not ds or not ds.source_path or not os.path.isfile(ds.source_path):
            return None

        if not ds.sample_id_column:
            return None

        df = pd.read_csv(ds.source_path)
        if df.empty:
            return None

        # Find the row matching record_id in sample_id_column
        match = df[df[ds.sample_id_column].astype(str) == str(record_id)]
        if match.empty:
            return None

        row = match.iloc[0]
        record = self._build_record(
            row, waveform_name, wd.sampling_rate, wd.units,
            ds.sample_id_column, ds.label_column,
        )

        if wd.start_column in df.columns and wd.end_column in df.columns:
            start_loc = df.columns.get_loc(wd.start_column)
            end_loc = df.columns.get_loc(wd.end_column)
            sample_cols = df.columns[start_loc : end_loc + 1]
            record.samples = [float(v) for v in row[sample_cols] if pd.notna(v)]

        return record
