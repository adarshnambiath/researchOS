import json
import os
from typing import Any

import pandas as pd

from app.config import settings
from app.readers.dataset_reader import DatasetReader, TabularDatasetReader, WFDBDatasetReader
from app.repositories.dataset_repository import DatasetRepository
from app.schemas.dataset import (
    ColumnMetadata,
    DatasetCreate,
    DatasetDetail,
    DatasetMetadata,
    DatasetPreview,
    DatasetUpdate,
    PlatformType,
)

_READERS: dict[str, DatasetReader] = {
    "tabular": TabularDatasetReader(),
    "ecg_wfdb": WFDBDatasetReader(),
}


class DatasetService:
    def __init__(self, repo: DatasetRepository, reader: DatasetReader | None = None) -> None:
        self.repo = repo
        self.reader = reader or _READERS["tabular"]

    def register(self, data: DatasetCreate, source_path: str) -> DatasetDetail:
        reader = _READERS.get(data.modality, _READERS["tabular"])
        row_count, metadata = reader.register(source_path)
        metadata.waveform_definitions = data.waveform_definitions or None

        storage_format = "wfdb" if data.modality == "ecg_wfdb" else data.storage_format

        db_obj = self.repo.create(
            name=data.name,
            description=data.description,
            modality=data.modality,
            storage_format=storage_format,
            source_path=source_path,
            label_column=data.label_column,
            sample_id_column=data.sample_id_column,
            row_count=row_count,
            schema_json=metadata.to_schema_json(),
        )

        return self._to_detail(db_obj, metadata)

    def get_detail(self, dataset_id: int) -> DatasetDetail | None:
        db_obj = self.repo.get_by_id(dataset_id)
        if not db_obj:
            return None

        metadata = DatasetMetadata.from_schema_json(db_obj.schema_json)
        return self._to_detail(db_obj, metadata)

    def list_all(self) -> list[dict]:
        datasets = self.repo.list_all()
        return [
            {
                "id": d.id,
                "name": d.name,
                "modality": d.modality,
                "row_count": d.row_count,
                "created_at": d.created_at.isoformat(),
            }
            for d in datasets
        ]

    def update(self, dataset_id: int, data: DatasetUpdate) -> DatasetDetail | None:
        db_obj = self.repo.get_by_id(dataset_id)
        if not db_obj:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_obj, key, value)

        self.repo.db.commit()
        self.repo.db.refresh(db_obj)
        metadata = DatasetMetadata.from_schema_json(db_obj.schema_json)
        return self._to_detail(db_obj, metadata)

    def delete(self, dataset_id: int) -> bool:
        return self.repo.delete(dataset_id)

    def read_preview(self, dataset_id: int, limit: int = 20) -> DatasetPreview | None:
        db_obj = self.repo.get_by_id(dataset_id)
        if not db_obj or not db_obj.source_path:
            return None

        if not os.path.isfile(db_obj.source_path):
            return None

        columns, rows = self.reader.read_preview(db_obj.source_path, limit=limit)
        return DatasetPreview(columns=columns, rows=rows)

    def _to_detail(
        self,
        db_obj: Any,
        metadata: DatasetMetadata | None,
    ) -> DatasetDetail:
        wfdb_meta = getattr(metadata, "wfdb", None)
        return DatasetDetail(
            id=db_obj.id,
            name=db_obj.name,
            description=db_obj.description,
            modality=db_obj.modality,
            storage_format=getattr(db_obj, "storage_format", None),
            source_path=db_obj.source_path,
            label_column=db_obj.label_column,
            sample_id_column=db_obj.sample_id_column,
            row_count=db_obj.row_count,
            dataset_schema=metadata.columns if metadata else None,
            waveform_definitions=metadata.waveform_definitions if metadata else None,
            wfdb_metadata=wfdb_meta,
            created_at=db_obj.created_at,
        )

    def _infer_metadata(self, df: pd.DataFrame) -> DatasetMetadata:
        columns: list[ColumnMetadata] = []
        for col_name in df.columns:
            series = df[col_name]
            inferred_type, nullable = self._infer_column_type(series)

            col_meta = ColumnMetadata(
                name=str(col_name),
                type=inferred_type,
                nullable=bool(nullable),
                missing_count=int(series.isna().sum()),
                unique_count=int(series.nunique(dropna=True)),
            )

            if inferred_type == PlatformType.INTEGER:
                col_meta.minimum = int(series.min()) if pd.Series(series.dropna()).notna().any() else None
                col_meta.maximum = int(series.max()) if pd.Series(series.dropna()).notna().any() else None
            elif inferred_type == PlatformType.FLOAT:
                col_meta.minimum = float(series.min()) if pd.Series(series.dropna()).notna().any() else None
                col_meta.maximum = float(series.max()) if pd.Series(series.dropna()).notna().any() else None
                col_meta.mean = float(series.mean()) if pd.Series(series.dropna()).notna().any() else None
            elif inferred_type == PlatformType.CATEGORICAL:
                categories = series.dropna().unique().tolist()
                col_meta.categories = [str(c) for c in categories]

            columns.append(col_meta)

        return DatasetMetadata(columns=columns, row_count=int(len(df)))

    def _infer_column_type(self, series: pd.Series) -> tuple[PlatformType, bool]:
        nullable = bool(series.isna().any())
        non_null = series.dropna()

        if len(non_null) == 0:
            return PlatformType.UNKNOWN, nullable

        if pd.api.types.is_bool_dtype(series):
            return PlatformType.BOOLEAN, nullable

        if pd.api.types.is_integer_dtype(series):
            return PlatformType.INTEGER, nullable

        if pd.api.types.is_float_dtype(series):
            return PlatformType.FLOAT, nullable

        if pd.api.types.is_datetime64_any_dtype(series):
            if pd.api.types.is_datetime64_ns_dtype(series):
                return PlatformType.DATETIME, nullable
            return PlatformType.DATE, nullable

        if pd.api.types.is_timedelta64_dtype(series):
            return PlatformType.TIME, nullable

        if pd.api.types.is_categorical_dtype(series) or pd.api.types.is_string_dtype(series):
            unique_count = non_null.nunique()
            if unique_count <= 20:
                return PlatformType.CATEGORICAL, nullable
            return PlatformType.STRING, nullable

        sample = non_null.head(20)
        if self._try_numeric(sample):
            return PlatformType.FLOAT, nullable
        if self._try_booleans(sample):
            return PlatformType.BOOLEAN, nullable
        if self._try_datetimes(sample):
            return PlatformType.DATETIME, nullable
        if self._try_dates(sample):
            return PlatformType.DATE, nullable
        if self._try_times(sample):
            return PlatformType.TIME, nullable
        if self._try_categorical(sample):
            return PlatformType.CATEGORICAL, nullable

        return PlatformType.STRING, nullable

    def _try_numeric(self, series: pd.Series) -> bool:
        try:
            cleaned = (
                series.astype(str)
                .str.replace(r"[^0-9eE+\-.]", "", regex=True)
                .replace("", None)
            )
            pd.to_numeric(cleaned)
            return True
        except Exception:
            return False

    def _try_booleans(self, series: pd.Series) -> bool:
        normalized = series.astype(str).str.strip().str.lower()
        return normalized.isin({"true", "false", "1", "0", "yes", "no"}).all()

    def _try_datetimes(self, series: pd.Series) -> bool:
        try:
            pd.to_datetime(series)
            return True
        except Exception:
            return False

    def _try_dates(self, series: pd.Series) -> bool:
        try:
            pd.to_datetime(series).dt.date
            return True
        except Exception:
            return False

    def _try_times(self, series: pd.Series) -> bool:
        try:
            pd.to_datetime(series).dt.time
            return True
        except Exception:
            return False

    def _try_categorical(self, series: pd.Series) -> bool:
        return series.nunique() <= 20
