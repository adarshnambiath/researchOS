# Investigation

This document describes the investigation pipeline: how evaluation rows are joined with dataset rows, the frontend UI, and waveform investigation.

---

## 1. Purpose

Investigation is the heart of the product. It lets researchers inspect individual predictions in the context of the original dataset. Without investigation, evaluation parquet files are just aggregate statistics. Investigation answers "why did the model get this row wrong?"

---

## 2. Investigation Flow

### 2.1 Step 1 — Select Run

The researcher selects a run from the Experiment Detail page (Investigation tab).

### 2.2 Step 2 — Query Evaluation

The frontend sends `QueryFilters` to the backend:

```
GET /api/experiments/{experiment_id}/investigation/query?preset=incorrect&limit=50
```

The backend calls `EvaluationEngine.query()` on `evaluation.parquet` and returns paginated results.

### 2.3 Step 3 — Get Row Detail

When the researcher expands a row, the frontend requests:

```
GET /api/experiments/{experiment_id}/investigation/row/{index}
```

The backend:
1. Reads the evaluation row from parquet via `EvaluationEngine.get_row()`.
2. If `sample_id` is present, loads the parent `Experiment` and `Dataset`.
3. Reads the dataset CSV from `dataset.source_path`.
4. Matches `sample_id` to `dataset.sample_id_column`.
5. Returns `RowDetail(evaluation_row, dataset_row)`.

### 2.4 Step 4 — Display

The frontend shows the `dataset_row` alongside the `evaluation_row`:
- Predicate columns from the dataset context
- Ground truth, prediction, confidence from the evaluation
- Correct/incorrect badge
- Inline waveform if the dataset has waveform definitions

---

## 3. Data Joins

### 3.1 sample_id Column

The join relies on `sample_id_column` being set on the dataset. If it is not set or the value is missing in the evaluation row, the dataset row is not included.

### 3.2 CSV Source Path

The platform reads the original CSV directly. It does not copy or cache the dataset. The source path must be accessible from the machine running the backend.

---

## 4. RowDetail Schema

```python
class RowDetail(BaseModel):
    evaluation_row: dict
    dataset_row: dict | None
```

Both rows are plain dicts. The `dataset_row` may be `None` if:
- `sample_id` is None in the evaluation row.
- `sample_id_column` is not set on the dataset.
- The CSV source file is missing or unreadable.
- No matching row is found in the CSV.

---

## 5. Frontend Display

### 5.1 Investigation Page

- Paginated table of evaluation results.
- Each row shows: `sample_id`, `ground_truth`, `prediction`, `confidence` (bar).
- Badges: green for correct, red for incorrect.
- Clicking a row expands detail: all dataset columns + evaluation columns.

### 5.2 Waveform Investigation

If the dataset has `waveform_definitions`, the expanded row detail includes a mini waveform viewer showing:
- The waveform samples for this sample_id.
- Channel labels and units.
- Sampling rate metadata.

This lets researchers see the raw signal that led to a particular prediction.

---

## 6. API Endpoints

### 6.1 Investigation Query

```
GET /api/experiments/{experiment_id}/investigation/query
```

Parameters: `preset`, `ground_truth`, `prediction`, `confidence_min`, `confidence_max`, `sample_id`, `limit`, `offset`

Returns: `(QueryResult, error)`

### 6.2 Investigation Row Detail

```
GET /api/experiments/{experiment_id}/investigation/row/{index}
```

Returns: `(RowDetail, error)`

---

## 7. Implementation Notes

### 7.1 Database Session in InvestigationService

`InvestigationService.get_row_detail()` creates a temporary SQLAlchemy session to load the experiment and dataset metadata. This avoids adding another dependency to the service constructor.

### 7.2 Performance Considerations

- Reading the entire CSV for each row detail is expensive for large datasets.
- Future optimization: cache the dataset DataFrame in the service after first read.
- Future optimization: use `pandas.read_csv()` with `usecols` to load only `sample_id_column` plus relevant columns.

---

## 8. Troubleshooting

### "Dataset row not found" for valid sample_ids
1. Verify `sample_id_column` is set on the dataset and matches a column in the CSV.
2. Verify the CSV source path is accessible and readable by the backend process.
3. Verify the data types match (e.g., sample_id is string in both evaluation and dataset).

### Investigation is slow for large datasets
The current implementation reads the full CSV for each row detail request. This is O(N) per request. Consider caching or extracting only the needed columns.

### Waveform viewer not appearing
1. Confirm the dataset has `waveform_definitions` in its schema.
2. Confirm the evaluation row has a `sample_id` matching an entry in the waveform definition.

---

## 9. Future Enhancements

- Dataset DataFrame caching (TTL-based, invalidate after file modification)
- Batch row detail endpoint (reduce round-trips for table detail view)
- Dataset column selection (investigator chooses which columns to display)
- Time-range based waveform slicing for long recordings
- Multi-record waveform comparison in investigation
- Integration with external investigation tools (export to Jupyter)
