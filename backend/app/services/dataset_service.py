import json
import os
from typing import Any

from app.config import settings
from app.readers.dataset_reader import DatasetReader, ReaderFactory
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
from app.schemas.patch import PatchMetadata as PatchMetadataModel


class DatasetService:
    def __init__(self, repo: DatasetRepository, reader: DatasetReader | None = None) -> None:
        self.repo = repo
        self.reader = reader  # optional injected dependency; used by read_preview

    # ── Registration ─────────────────────────────────────────────────

    def register(self, data: DatasetCreate, source_path: str) -> DatasetDetail:
        reader = ReaderFactory.get_reader(data.modality)
        row_count, metadata = reader.register(source_path)

        # Only tabular datasets carry waveform definitions
        if isinstance(metadata, DatasetMetadata):
            metadata.waveform_definitions = data.waveform_definitions or None

        if data.modality == "ecg_wfdb":
            storage_format = "wfdb"
        elif data.modality == "patch":
            storage_format = "patch_folder"
        else:
            storage_format = data.storage_format

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

    # ── Reads ────────────────────────────────────────────────────────

    def get_detail(self, dataset_id: int) -> DatasetDetail | None:
        db_obj = self.repo.get_by_id(dataset_id)
        if not db_obj:
            return None

        if db_obj.modality == "patch":
            metadata: DatasetMetadata | PatchMetadataModel | None = (
                PatchMetadataModel.from_schema_json(db_obj.schema_json)
            )
        else:
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

    def read_preview(self, dataset_id: int, limit: int = 20) -> DatasetPreview | None:
        db_obj = self.repo.get_by_id(dataset_id)
        if not db_obj or not db_obj.source_path:
            return None

        reader = ReaderFactory.get_reader(db_obj.modality)
        try:
            columns, rows = reader.read_preview(db_obj.source_path, limit=limit)
        except Exception as exc:
            raise ValueError(f"Failed to read preview: {exc}") from exc

        return DatasetPreview(columns=columns, rows=rows)

    # ── Updates / Deletion ───────────────────────────────────────────

    def update(self, dataset_id: int, data: DatasetUpdate) -> DatasetDetail | None:
        db_obj = self.repo.get_by_id(dataset_id)
        if not db_obj:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_obj, key, value)

        self.repo.db.commit()
        self.repo.db.refresh(db_obj)
        if db_obj.modality == "patch":
            metadata: DatasetMetadata | PatchMetadataModel | None = (
                PatchMetadataModel.from_schema_json(db_obj.schema_json)
            )
        else:
            metadata = DatasetMetadata.from_schema_json(db_obj.schema_json)
        return self._to_detail(db_obj, metadata)

    def delete(self, dataset_id: int) -> bool:
        return self.repo.delete(dataset_id)

    # ── Private helpers ──────────────────────────────────────────────

    def _to_detail(
        self,
        db_obj: Any,
        metadata: DatasetMetadata | PatchMetadataModel | None,
    ) -> DatasetDetail:
        wfdb_meta = getattr(metadata, "wfdb", None) if isinstance(metadata, DatasetMetadata) else None
        patch_meta: PatchMetadataModel | None = metadata if isinstance(metadata, PatchMetadataModel) else None
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
            dataset_schema=metadata.columns if isinstance(metadata, DatasetMetadata) else None,
            waveform_definitions=metadata.waveform_definitions if isinstance(metadata, DatasetMetadata) else None,
            wfdb_metadata=wfdb_meta,
            patch_metadata=patch_meta,
            created_at=db_obj.created_at,
        )
