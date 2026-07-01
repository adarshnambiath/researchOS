from pydantic import BaseModel, Field


class QueryFilters(BaseModel):
    preset: str = Field(default="all", pattern="^(all|correct|incorrect|false_positive|false_negative)$")
    ground_truth: str | None = None
    prediction: str | None = None
    confidence_min: float | None = Field(default=None, ge=0.0, le=1.0)
    confidence_max: float | None = Field(default=None, ge=0.0, le=1.0)
    sample_id: str | int | None = None
    limit: int = Field(default=100, ge=1, le=1000)
    offset: int = Field(default=0, ge=0)


class QueryResult(BaseModel):
    rows: list[dict]
    total: int
    offset: int
    limit: int
    columns: list[str]


class Insights(BaseModel):
    accuracy: float | None = None
    total_rows: int = 0
    correct_count: int = 0
    incorrect_count: int = 0
    false_positive_count: int = 0
    false_negative_count: int = 0
    prediction_distribution: dict[str, int] = {}
    ground_truth_distribution: dict[str, int] = {}
    top_confusion_pairs: list[dict] = []


class RowDetail(BaseModel):
    evaluation_row: dict
    dataset_row: dict | None = None
