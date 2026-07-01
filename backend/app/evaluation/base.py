from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Literal


@dataclass
class QueryFilters:
    preset: Literal[
        "all", "correct", "incorrect", "false_positive", "false_negative"
    ] = "all"
    ground_truth: str | None = None
    prediction: str | None = None
    confidence_min: float | None = None
    confidence_max: float | None = None
    sample_id: str | int | None = None
    limit: int = 100
    offset: int = 0


@dataclass
class QueryResult:
    rows: list[dict]
    total: int
    offset: int
    limit: int
    columns: list[str]


@dataclass
class Insights:
    accuracy: float | None = None
    total_rows: int = 0
    correct_count: int = 0
    incorrect_count: int = 0
    false_positive_count: int = 0
    false_negative_count: int = 0
    prediction_distribution: dict[str, int] | None = None
    ground_truth_distribution: dict[str, int] | None = None
    top_confusion_pairs: list[dict] | None = None


class EvaluationEngine(ABC):
    @abstractmethod
    def query(self, filepath: str, filters: QueryFilters) -> QueryResult:
        pass

    @abstractmethod
    def compute_insights(self, filepath: str) -> Insights:
        pass

    @abstractmethod
    def get_row(self, filepath: str, index: int) -> dict:
        pass
