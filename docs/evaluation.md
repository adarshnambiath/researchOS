# Evaluation

This document describes the evaluation pipeline: schema, query language, engines, and metrics.

---

## 1. Overview

Evaluation is the process of querying and summarising row-level predictions stored in `evaluation.parquet`. The platform supports pluggable evaluation engines, with a Pandas implementation as the default.

### 1.1 Key Files

```
evaluation/
├── base.py          # EvaluationEngine ABC, QueryFilters, QueryResult, Insights
├── pandas_engine.py # Pandas-based implementation
```

---

## 2. Evaluation Contract (SDK Output)

The SDK writes `evaluation.parquet` into the run's workspace.

**Required columns:**
- `sample_id` — str or int, matching the dataset's `sample_id_column`
- `ground_truth` — the actual label value
- `prediction` — the model's predicted label value

**Optional columns:**
- `confidence` — float, model confidence
- Any domain-specific columns the SDK chooses to write

---

## 3. QueryFilters

`backend/app/evaluation/base.py`:

```python
class QueryFilters:
    preset: Literal["all", "correct", "incorrect", "false_positive", "false_negative"] = "all"
    ground_truth: str | None = None
    prediction: str | None = None
    confidence_min: float | None = None
    confidence_max: float | None = None
    sample_id: str | int | None = None
    limit: int = 100
    offset: int = 0
```

### 3.1 Presets

| Preset | Description |
|---------|-------------|
| `all` | Return all rows (subject to other filters) |
| `correct` | `ground_truth == prediction` |
| `incorrect` | `ground_truth != prediction` |
| `false_positive` | `ground_truth != prediction` with `ground_truth` being the negative class (heuristic) |
| `false_negative` | `ground_truth != prediction` with `prediction` being the negative class (heuristic) |

### 3.2 Example Queries

```python
# All incorrect predictions with confidence < 0.5
QueryFilters(preset="incorrect", confidence_max=0.5, limit=50)

# Rows where ground_truth equals "cat"
QueryFilters(ground_truth="cat")

# Specific sample by ID
QueryFilters(sample_id="SAMPLE-001")
```

---

## 4. QueryResult

```python
class QueryResult:
    rows: list[dict]
    total: int
    offset: int
    limit: int
    columns: list[str]
```

- `total` is the total matching row count (ignoring pagination).
- `rows` contains the current page.
- `columns` lists the column names present in the parquet file.

---

## 5. Insights

`compute_insights()` reads the entire parquet file once and computes aggregate statistics.

```python
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
```

### 5.1 Automatic Calculations

- `accuracy` = `correct_count / total_rows`
- `false_positive_count` / `false_negative_count` use heuristic class detection
- `top_confusion_pairs` lists the most common `(ground_truth, prediction)` mismatches

---

## 6. Pandas Evaluation Engine

`PandasEvaluationEngine` (`backend/app/evaluation/pandas_engine.py`) reads the parquet with `pd.read_parquet()` and applies filters via boolean indexing.

```python
class PandasEvaluationEngine(EvaluationEngine):
    def query(self, filepath: str, filters: QueryFilters) -> QueryResult: ...
    def compute_insights(self, filepath: str) -> Insights: ...
    def get_row(self, filepath: str, index: int) -> dict: ...
```

- `query` applies `QueryFilters` after loading the parquet.
- `compute_insights` computes accuracy, counts, and confusion analysis.
- `get_row` returns the row at absolute position `index`.

---

## 7. API Endpoints

### 7.1 Query Evaluation Rows

```
GET /api/experiments/{experiment_id}/investigation/query
```

Query parameters map to `QueryFilters`. Returns `(QueryResult, error)`.

### 7.2 Get Row Detail

```
GET /api/experiments/{experiment_id}/investigation/row/{index}
```

Returns `RowDetail(evaluation_row, dataset_row)`. The `dataset_row` may be None if `sample_id` is missing or the dataset source path is unreadable.

### 7.3 Compute Insights

```
GET /api/runs/{run_id}/evaluation/insights
```

Returns `Insights`. Returns error if `evaluation.parquet` is missing.

### 7.4 Get Evaluation Row

```
GET /api/runs/{run_id}/evaluation/row/{index}
```

Returns a single evaluation row as a dict.

---

## 8. Frontend Display

### 8.1 RunEvaluation.tsx

Displays:
- Accuracy badge (derived from `Insights`)
- Distribution bar chart (predictions vs ground truth)
- Confusion pair table (top confusion pairs)
- Paginated row table with correct/incorrect badges and confidence bars

### 8.2 Investigation.tsx

Displays:
- Paginated evaluation rows with ground truth, prediction, confidence
- Expandable row detail showing joined dataset features
- Inline waveform viewer if dataset has waveform definitions

---

## 9. Troubleshooting

### Parquet file unreadable
If the platform raises a 500 error when querying evaluation, verify:
1. The `evaluation.parquet` file exists in the run's output directory.
2. The file is a valid parquet (use `pd.read_parquet()` to verify).
3. Required columns (`sample_id`, `ground_truth`, `prediction`) are present.

### False positive/negative detection is wrong
The current heuristic uses frequency distribution to guess the positive class. If your dataset has balanced classes, the heuristic may not match your intuition.

---

## 10. Future Evaluation Enhancements

- DuckDB-backed engine for large parquet files
- Multiple evaluation files per run (per-fold, per-class)
- Custom metric definitions via the SDK
- Per-class precision/recall breakdowns
- Calibration curves for confidence scores
- Threshold-based filtering UI
