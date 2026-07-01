import json
import os
from pathlib import Path

import pandas as pd

from app.config import settings
from app.repositories.dataset_repository import DatasetRepository
from app.schemas.dataset import DatasetCreate, DatasetDetail


class DatasetService:
    def __init__(self, repo: DatasetRepository) -> None:
        self.repo = repo

    def register(self, data: DatasetCreate, source_path: str) -> DatasetDetail:
        if not os.path.isfile(source_path):
            raise FileNotFoundError(f"File not found: {source_path}")

        df = pd.read_csv(source_path, nrows=0)
        columns = list(df.columns)
        dtypes = {col: str(df.dtypes[col]) for col in columns}

        full_df = pd.read_csv(source_path)
        row_count = len(full_df)
        preview_rows = json.loads(full_df.head(20).to_json(orient="records"))

        db_obj = self.repo.create(
            name=data.name,
            description=data.description,
            modality=data.modality,
            source_path=source_path,
            label_column=data.label_column,
            sample_id_column=data.sample_id_column,
            row_count=row_count,
            columns_json=json.dumps(columns),
            dtypes_json=json.dumps(dtypes),
            schema_json=json.dumps({"columns": columns, "dtypes": dtypes}),
            preview_json=json.dumps(preview_rows),
        )

        return DatasetDetail(
            id=db_obj.id,
            name=db_obj.name,
            description=db_obj.description,
            modality=db_obj.modality,
            source_path=db_obj.source_path,
            label_column=db_obj.label_column,
            sample_id_column=db_obj.sample_id_column,
            row_count=db_obj.row_count,
            columns=columns,
            dtypes=dtypes,
            preview_rows=preview_rows,
            created_at=db_obj.created_at,
        )

    def get_detail(self, dataset_id: int) -> DatasetDetail | None:
        db_obj = self.repo.get_by_id(dataset_id)
        if not db_obj:
            return None

        columns = json.loads(db_obj.columns_json) if db_obj.columns_json else None
        dtypes = json.loads(db_obj.dtypes_json) if db_obj.dtypes_json else None
        preview_rows = json.loads(db_obj.preview_json) if db_obj.preview_json else None

        return DatasetDetail(
            id=db_obj.id,
            name=db_obj.name,
            description=db_obj.description,
            modality=db_obj.modality,
            source_path=db_obj.source_path,
            label_column=db_obj.label_column,
            sample_id_column=db_obj.sample_id_column,
            row_count=db_obj.row_count,
            columns=columns,
            dtypes=dtypes,
            preview_rows=preview_rows,
            created_at=db_obj.created_at,
        )

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

    def delete(self, dataset_id: int) -> bool:
        return self.repo.delete(dataset_id)
