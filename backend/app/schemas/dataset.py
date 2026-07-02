from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class PlatformType(str, Enum):
    STRING = "string"
    INTEGER = "integer"
    FLOAT = "float"
    BOOLEAN = "boolean"
    DATE = "date"
    DATETIME = "datetime"
    TIME = "time"
    CATEGORICAL = "categorical"
    UNKNOWN = "unknown"


class ColumnMetadata(BaseModel):
    name: str
    type: PlatformType
    nullable: bool = False
    missing_count: int | None = None
    unique_count: int | None = None
    minimum: Any | None = None
    maximum: Any | None = None
    mean: float | None = None
    categories: list[str] | None = None
    units: str | None = None


class DatasetMetadata(BaseModel):
    columns: list[ColumnMetadata]
    row_count: int

    def to_schema_json(self) -> str:
        return self.model_dump_json()

    @classmethod
    def from_schema_json(cls, raw: str | None) -> "DatasetMetadata | None":
        if not raw:
            return None
        return cls.model_validate_json(raw)


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
    dataset_schema: list[ColumnMetadata] | None
    created_at: datetime

    model_config = {"from_attributes": True}


class DatasetPreview(BaseModel):
    columns: list[str]
    rows: list[dict]
