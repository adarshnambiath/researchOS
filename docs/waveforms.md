# Waveforms

This document describes the waveform subsystem: provider pattern, storage formats, API, and frontend rendering.

---

## 1. Purpose

The waveform subsystem provides a unified interface for reading and serving waveform data from different storage formats (CSV with wide columns, WFDB `.hea/.dat` pairs, EDF, etc.). The frontend and API never know which provider served the data — they only see a `WaveformRecord`.

---

## 2. Provider Pattern

### 2.1 Architecture

```
ProviderRegistry (maps storage_format → provider class)
    │
    ├── CSVWaveformProvider (reads column ranges from CSV)
    └── WFDBWaveformProvider (reads .hea/.dat via wfdb library)
```

The `WaveformService` statically resolves the correct provider for a dataset based on its `storage_format` and delegates all operations.

### 2.2 Provider Interface

`backend/app/waveform/provider.py`:

```python
class WaveformProvider(ABC):
    def list_waveforms(self, dataset_id: int) -> list[WaveformListItem]: ...
    def get_preview(self, dataset_id: int, waveform_name: str) -> WaveformRecord | None: ...
    def get_record(self, dataset_id, waveform_name, record_id,
                   start_sample=0, num_samples=None) -> WaveformRecord | None: ...
```

Any new format adds a class implementing this interface and registers it. No changes to service, router, or frontend are needed for the basic pipeline to work.

### 2.3 ProviderRegistry

`backend/app/waveform/registry.py`:

```python
class ProviderRegistry:
    @classmethod
    def register(cls, storage_format: str, provider_cls: type[WaveformProvider]) -> None: ...
    @classmethod
    def get_provider(cls, storage_format: str) -> type[WaveformProvider] | None: ...
    @classmethod
    def registered_formats(cls) -> list[str]: ...
```

Built-in providers register themselves at import time:

```python
# backend/app/waveform/__init__.py
ProviderRegistry.register("csv", CSVWaveformProvider)
ProviderRegistry.register("wfdb", WFDBWaveformProvider)
```

---

## 3. Core Models

### 3.1 WaveformRecord

The standardised shape returned by all providers.

```python
class WaveformRecord(BaseModel):
    waveform_name: str
    record_id: str
    label: str | None = None
    sampling_rate_hz: float | None = None
    units: str | None = None
    samples: list[float]              # first channel (for visual display)
    channel_names: list[str] | None = None
    channel_units: list[str] | None = None
    all_channels: list[list[float]] | None = None  # per-channel data
    total_samples: int | None = None
```

### 3.2 WaveformListItem

Summary for list views.

```python
class WaveformListItem(BaseModel):
    name: str
    sampling_rate_hz: float | None = None
    units: str | None = None
    start_column: str
    end_column: str
```

---

## 4. CSV Provider

### 4.1 How It Works

`CSVWaveformProvider` uses `WaveformDefinition` stored in `DatasetMetadata` to locate waveform columns.

When `list_waveforms` is called, it returns all `WaveformDefinition` entries for the dataset.

When `get_preview` or `get_record` is called:
1. It looks up the matching `WaveformDefinition` by name.
2. It reads the CSV.
3. It extracts column slice from `start_column` to `end_column` (inclusive).
4. It maps `record_id` to the row by matching `sample_id_column`.
5. It returns a `WaveformRecord` with `samples` populated.

### 4.2 Windowing

For very long sequences, the provider supports windowing via `start_sample` and `num_samples`. Currently, the CSV provider loads the entire row; windowing is primarily useful for streaming providers like WFDB.

---

## 5. WFDB Provider

### 5.1 How It Works

`WFDBWaveformProvider` uses the `wfdb` library to read `.hea`/`.dat` files.

When `list_waveforms` is called, it returns each `.hea` file discovered in metadata as a `WaveformListItem`.

When `get_preview` is called:
1. It locates the matching `WFDBRecordMetadata` by `record_name`.
2. It reads the first `PREVIEW_SECONDS * sampling_rate` samples using `wfdb.rdrecord`.
3. It returns a `WaveformRecord` with all channels accessible via `all_channels`.

When `get_record` is called:
1. Same as preview, but with custom `start_sample` and `num_samples`.
2. Uses `sampfrom` and `sampto` parameters of `wfdb.rdrecord` to avoid loading the entire file.

### 5.2 Multi-Channel Support

WFDB recordings may have multiple channels. The provider stores:
- `samples` — first channel (for the default visualiser)
- `all_channels` — all channels as `list[list[float]]`
- `channel_names` — signal names from the header
- `channel_units` — signal units from the header

The frontend can expand to multi-channel view using this data.

### 5.3 Dependencies

The `wfdb` package is required for ECG modality:

```
pip install wfdb>=4.0.0
```

If the package is missing, the router raises a `500` error with a clear message.

---

## 6. Frontend API

### 6.1 List Waveforms

```
GET /api/datasets/{dataset_id}/waveforms
```

Returns `list[WaveformListItem]`. Returns 404 if no waveform definitions are found for the dataset.

### 6.2 Preview Waveform

```
GET /api/datasets/{dataset_id}/waveforms/{waveform_name}/preview
```

Returns `WaveformRecord` for the first record:
- CSV: first row, all sample columns
- WFDB: first 10 seconds of the recording

### 6.3 Get Record

```
GET /api/datasets/{dataset_id}/waveforms/{waveform_name}/record/{record_id}?start_sample=0&num_samples=1000
```

Returns a windowed `WaveformRecord`. Use this for paging through long recordings.

---

## 7. Frontend Rendering

`WaveformViewer.tsx` renders a `WaveformRecord` into an HTML5 Canvas:

- X-axis: samples (indexed)
- Y-axis: signal amplitude
- Channel selector for multi-channel data
- Support for paging via `start_sample` / `num_samples` query parameters when the user scrolls or zooms

The viewer calls `/waveforms/{waveform_name}/record/{record_id}` with windowing parameters to load segments on demand.

---

## 8. Extending Waveforms

### 8.1 Adding a New Provider

1. Implement `WaveformProvider` ABC in `backend/app/waveform/new_provider.py`.
2. Add the provider class file with the three interface methods.
3. Register in `backend/app/waveform/__init__.py`:
   ```python
   ProviderRegistry.register("edf", EDFWaveformProvider)
   ```
4. Add frontend waveform viewer support if the provider returns new data shapes (e.g., non-contiguous axes or irregular sampling).

### 8.2 Adding a New Modality with Waveforms

1. Add the modality to `DatasetCreate` schema.
2. Create a modality-specific `DatasetReader`.
3. Store waveform metadata in `DatasetMetadata` (extend the schema if needed).
4. Create a matching `WaveformProvider`.
5. Register the provider.
6. Update frontend registration form.

### 8.3 Frontend Channel Switching

The current `WaveformRecord.all_channels` exposes all channels. To add a channel selector:

1. Add `selected_channel_index` state in `WaveformViewer.tsx`.
2. When `selected_channel_index` changes, display `all_channels[selected_channel_index]`.
3. Update channel name and units display accordingly.
