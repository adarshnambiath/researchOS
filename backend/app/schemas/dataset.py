from datetime import datetime

from pydantic import BaseModel, Field


class DatasetCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    modality: str = Field(default="tabular", max_length=50)
    label_column: str | None = None
    sample_id_column: str | None = None


class DatasetUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    modality: str | None = None
    label_column: str | None = None
    sample_id_column: str | None = None


class DatasetPreview(BaseModel):
    columns: list[str]
    dtypes: dict[str, str]
    row_count: int
    preview_rows: list[dict]


class DatasetList(BaseModel):
    id: int
    name: str
    modality: str
    row_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class DatasetDetail(BaseModel):
    id: int
    name: str
    description: str | None
    modality: str
    source_path: str
    label_column: str | None
    sample_id_column: str | None
    row_count: int
    columns: list[str] | None
    dtypes: dict[str, str] | None
    preview_rows: list[dict] | None
    created_at: datetime

    model_config = {"from_attributes": True}
