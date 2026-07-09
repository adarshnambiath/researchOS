# Datasets

This document describes how datasets are registered, stored, previewed, and investigated.

---

## 1. Dataset Concept

A Dataset is a pointer to a CSV file that the researcher already owns. The platform never copies the dataset. On registration, the platform reads the CSV once to extract metadata and a preview. The original file remains at its source path.

---

## 2. Registration Flow

1. **User** fills out the Dataset registration form with:
   - `name`, `description`
   - `modality` (`tabular` or `ecg_wfdb`)
   - `source_path` — absolute path to the CSV or WFDB directory
   - `label_column` (optional) — column containing target labels
   - `sample_id_column` (optional) — column containing unique sample identifiers
   - `waveform_definitions` (optional for tabular) — column ranges for waveform data

2. **Backend** calls `DatasetService.register()`:
   - Selects the appropriate `DatasetReader` based on modality
   - Reader parses the file, infers schema, and extracts metadata
   - Metadata is serialised to JSON and stored in `dataset.schema_json`
   - Database row is created with computed `row_count`

3. **Response** returns `DatasetDetail` with:
   - `dataset_schema` — list of `ColumnMetadata`
   - `waveform_definitions` — optional waveform column ranges
   - `wfdb_metadata` — optional WFDB record metadata

---

## 3. Modality Types

### 3.1 Tabular (`modality: "tabular"`)

The default modality for CSV datasets. The `TabularDatasetReader` reads the file with pandas and infers column types.

**Supported storage formats:** `csv`

### 3.2 ECG/WFDB (`modality: "ecg_wfdb"`)

For ECG waveform datasets stored in WFDB format. The `WFDBDatasetReader` uses the `wfdb` library to read `.hea`/`.dat` pairs and extract record metadata.

**Supported storage formats:** `wfdb`

---

## 4. Schema and Metadata

### 4.1 ColumnMetadata

```python
class ColumnMetadata(BaseModel):
    name: str
    type: PlatformType   # STRING, INTEGER, FLOAT, CATEGORICAL, DATETIME, ...
    nullable: bool
    missing_count: int | None
    unique_count: int | None
    minimum: Any | None
    maximum: Any | None
    mean: float | None
    categories: list[str] | None
    units: str | None
```

### 4.2 PlatformType Enum

| Type | Description |
|------|-------------|
| `STRING` | Free text, high cardinality |
| `INTEGER` | Whole numbers |
| `FLOAT` | Continuous numbers |
| `BOOLEAN` | True/False |
| `CATEGORICAL` | Limited unique values (≤ 20) |
| `DATE` | YYYY-MM-DD |
| `DATETIME` | Date + time |
| `TIME` | Time of day |
| `UNKNOWN` | Fallback |

Type inference uses pandas dtype checks plus fallback heuristics (numeric parsing, boolean normalisation, datetime parsing).

---

## 5. Waveform Definitions

For tabular datasets that contain waveform columns, the researcher can define `WaveformDefinition` objects:

```python
class WaveformDefinition(BaseModel):
    name: str                    # e.g. "ECG Lead II"
    start_column: str            # first sample column
    end_column: str              # last sample column (inclusive)
    sampling_rate: float | None  # Hz
    units: str | None            # e.g. "mV"
```

The `CSVWaveformProvider` uses `start_column` → `end_column` to extract the contiguous column range.

---

## 6. WFDB Metadata

For ECG/WFDB datasets, the parser discovers records by scanning the source directory for `.hea` files:

```python
class WFDBDatasetMetadata(BaseModel):
    number_of_records: int
    records: list[WFDBRecordMetadata]
    sampling_rate: float | None
    channel_names: list[str] | None
    signal_units: list[str] | None
    number_of_channels: int | None
```

Each `WFDBRecordMetadata` captures one `.hea`/`.dat` pair.

### 6.1 WFDB Record Metadata

```python
class WFDBRecordMetadata(BaseModel):
    record_name: str
    sampling_rate: float | None
    channel_names: list[str] | None
    signal_units: list[str] | None
    number_of_channels: int | None
```

---

## 7. Preview

The frontend requests a preview via:

```
GET /api/datasets/{id}/preview?limit=20
```

The backend reads the first `limit` rows using the appropriate reader and returns:

```python
class DatasetPreview(BaseModel):
    columns: list[str]
    rows: list[dict]
```

---

## 8. Dataset-Experiment-Run Relationship

```
Dataset
  └──► Experiments (many)
        └──► Runs (many)
              └──► Outputs (many)
```

An Experiment belongs to exactly one Dataset because the investigation phase needs to cross-reference evaluation rows with original dataset rows by `sample_id`.

---

## 9. Dataset CRUD Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/datasets/` | List all datasets |
| `POST` | `/api/datasets/` | Register new dataset |
| `GET` | `/api/datasets/{id}` | Get dataset detail |
| `PUT` | `/api/datasets/{id}` | Update dataset metadata |
| `DELETE` | `/api/datasets/{id}` | Delete dataset (cascades) |
| `GET` | `/api/datasets/{id}/preview` | Get 20-row preview |

---

## 10. Troubleshooting

### Source path not found
The `source_path` must be an absolute path accessible from the machine running the backend. If the file is moved after registration, preview and investigation will fail.

### WFDB not installed
The `wfdb` package must be installed for ECG modality:
```
pip install wfdb>=4.0.0
```

### Preview fails for large files
The preview reads only the first N rows. If the CSV cannot be read at all (encoding issues, corrupted file), the registration will fail and the dataset will not be created.
