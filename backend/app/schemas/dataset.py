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


class WaveformDefinition(BaseModel):
    name: str
    start_column: str
    end_column: str
    sampling_rate: float | None = None
    units: str | None = None


class WFDBRecordMetadata(BaseModel):
    record_name: str
    sampling_rate: float | None = None
    channel_names: list[str] | None = None
    signal_units: list[str] | None = None
    number_of_channels: int | None = None


class WFDBDatasetMetadata(BaseModel):
    number_of_records: int
    records: list[WFDBRecordMetadata]
    sampling_rate: float | None = None
    channel_names: list[str] | None = None
    signal_units: list[str] | None = None
    number_of_channels: int | None = None

    def to_schema_json(self) -> str:
        return self.model_dump_json()

    @classmethod
    def from_schema_json(cls, raw: str | None) -> "WFDBDatasetMetadata | None":
        if not raw:
            return None
        return cls.model_validate_json(raw)


class DatasetMetadata(BaseModel):
    columns: list[ColumnMetadata]
    row_count: int
    waveform_definitions: list[WaveformDefinition] | None = None
    wfdb: WFDBDatasetMetadata | None = None

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
    storage_format: str = Field(default="csv", max_length=50)
    label_column: str | None = None
    sample_id_column: str | None = None
    waveform_definitions: list[WaveformDefinition] | None = None


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
    storage_format: str = "csv"
    source_path: str
    label_column: str | None
    sample_id_column: str | None
    row_count: int
    dataset_schema: list[ColumnMetadata] | None
    waveform_definitions: list[WaveformDefinition] | None = None
    wfdb_metadata: WFDBDatasetMetadata | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DatasetPreview(BaseModel):
    columns: list[str]
    rows: list[dict]
