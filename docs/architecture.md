# Research OS — System Architecture

This document describes the complete architecture of Research OS, from high-level system design to component-level internals.

---

## 1. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Research OS System                              │
│                                                                         │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────────┐  │
│  │              │    │                  │    │                      │  │
│  │  Researcher  │◄──►│  Backend API     │◄──►│  Frontend (React)    │  │
│  │  + SDK       │    │  (FastAPI)       │    │  (Vite + TS)         │  │
│  │              │    │                  │    │                      │  │
│  └──────┬───────┘    └────────┬─────────┘    └──────────────────────┘  │
│         │                    │                                          │
│         │                    │                                          │
│         ▼                    ▼                                          │
│  ┌─────────────────────────────────────────┐                           │
│  │              Workspace (Filesystem)      │                           │
│  │  ┌────────────────────────────────┐      │                           │
│  │  │  workspace/                     │      │                           │
│  │  │  ├── experiments/               │      │                           │
│  │  │  │   └── experiment_{id}/       │      │                           │
│  │  │  │       └── run_{id}/          │      │                           │
│  │  │  │           ├── evaluation.parquet │  │                           │
│  │  │  │           ├── metrics.json   │      │                           │
│  │  │  │           └── artifacts.json │      │                           │
│  │  │  └── ...                        │      │                           │
│  │  └────────────────────────────────┘      │                           │
│  └─────────────────────────────────────────┘                           │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    SQLite Database (research_os.db)             │  │
│  │  datasets ──► experiments ──► runs ──► outputs                 │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key invariants:**
- The SDK never runs inside this repository. It is an external package.
- The filesystem is the contract between SDK and platform.
- The platform only reads outputs after they are written by the SDK.
- The backend never modifies dataset source files.

---

## 2. Backend Architecture

### 2.1 Architectural Pattern

The backend follows a strict layered architecture:

```
FastAPI Router
     │
     ▼
  Service Layer (business logic)
     │
     ├──► Repository Layer (CRUD)
     │
     └──► Specialist Components
            ├── WaveformService + ProviderRegistry
            ├── EvaluationEngine (pandas)
            └── InvestigationService
```

Each layer has a single responsibility:
- **Router**: HTTP interface, dependency injection, request/response serialization
- **Service**: Orchestration, validation, cross-repo coordination
- **Repository**: Direct SQLAlchemy CRUD
- **Specialist Component**: Domain-specific logic (waveforms, evaluation, investigation)

### 2.2 Dependency Flow

```
routers
  └──► services
        ├──► repositories
        │     └──► models (SQLAlchemy)
        │
        └──► schemas (Pydantic)
```

No circular dependencies. Services import repositories. Routers import services.

### 2.3 Repository Pattern

```
BaseRepository[ModelType]
    ├── DatasetRepository
    ├── ExperimentRepository
    ├── RunRepository
    └── OutputRepository
```

`BaseRepository` provides generic methods:
- `get_by_id(id)`
- `list_all()`
- `create(**kwargs)`
- `delete(id)`

Concrete repositories extend with domain-specific queries (e.g., `list_by_dataset`, `list_by_run`, `get_by_run_and_type`).

### 2.4 Database Schema

```
Dataset (1) ──► (N) Experiment (1) ──► (N) Run (1) ──► (N) Output
```

All foreign keys use `ondelete=CASCADE`. Deleting a dataset cascades through its entire hierarchy.

### 2.5 Service Layer

Each service coordinates repositories and applies business logic:

- **DatasetService**: Registers datasets using reader, parses metadata, manages preview
- **ExperimentService**: Validates dataset ownership, computes run counts
- **RunService**: Creates workspace directories, manages run lifecycle
- **OutputService**: Scans output directory, detects output files (evaluation.parquet, metrics.json, artifacts.json)
- **WaveformService**: Resolves provider by storage format, delegates waveform operations
- **InvestigationService**: Joins evaluation parquet with dataset rows via pandas

### 2.6 Router Endpoints

Routers are grouped by domain:
- `/api/datasets/` — Dataset CRUD, preview
- `/api/experiments/` — Experiment CRUD by dataset
- `/api/runs/` — Run CRUD, workspace management
- `/api/outputs/` — Output discovery, sync
- `/api/datasets/{id}/waveforms/` — Waveform reading by provider
- `/api/experiments/{id}/investigation/` — Evaluation query and insights
- `/api/runs/{id}/evaluation/` — Evaluation row and insights

---

## 3. Frontend Architecture

### 3.1 Technology Stack

- **React 18** with **Vite** (_SSR-free_ SPA)
- **TypeScript** (strict mode)
- **TailwindCSS** (professional light theme, dense data layout)
- **React Router** (v6) for client-side routing
- **Zustand** for state management (one store per domain)

### 3.2 State Management

```
One store per domain, no global store
├── useDatasetStore (DATASETS page, DatasetDetail)
├── useExperimentStore (EXPERIMENTS page, ExperimentDetail)
├── useRunStore (RUNS page, RunDetail, WaveformViewer, RunEvaluation)
└── (future: useInvestigationStore for Investigation page)
```

Each store exposes:
- `items` — list of list items
- `selected` — full detail of currently selected entity
- `loading`, `error` — async status
- `load`, `loadOne`, `create`, `update`, `delete` — actions
- Domain-specific extras (e.g., `loadPreview`, `syncOutputs`, `loadOutputs`)

### 3.3 API Client Layer

```
frontend/src/api/
├── client.ts       — Base fetch wrapper with env-based base URL, auth headers
├── datasets.ts     — Dataset CRUD + preview
├── experiments.ts  — Experiment CRUD filtered by dataset
├── runs.ts         — Run CRUD + outputs sync
├── outputs.ts      — Output listing, sync
├── waveforms.ts    — Waveform list, preview, record retrieval
├── evaluation.ts   — Evaluation rows, insights, metrics
└── investigation.ts — Investigation queries, row details
```

The API layer is thin. Every function is a `fetch()` call that returns typed data. Stores call these functions.

### 3.4 Pages and Routing

```
/
  └── Datasets
       └── /datasets/:id
            ├── Experiments
            │    └── /experiments/:id
            │         ├── Runs
            │         │    ├── /runs/:id — RunDetail
            │         │    │    ├── WaveformViewer
            │         │    │    └── RunEvaluation
            │         │    └── RunEvaluation (list across runs)
            │         └── Investigation
            └── WaveformViewer
```

### 3.5 Component Strategy

- **Dense tables** for data display (minimal padding, compact typography)
- **No decorative effects** — professional research-tool aesthetic
- **Light theme** designed for well-lit office/lab environments
- Components are grouped by domain under `components/`

---

## 4. Waveform Subsystem

### 4.1 Purpose

The waveform subsystem provides a unified interface for reading and serving waveform data from different storage formats (CSV with wide columns, WFDB `.hea/.dat` pairs, EDF, etc.).

### 4.2 Provider Pattern

```
ProviderRegistry (maps storage_format → provider class)
    │
    ├── CSVWaveformProvider (reads column ranges from CSV)
    └── WFDBWaveformProvider (reads .hea/.dat via wfdb library)
```

**Contracts** (`backend/app/waveform/provider.py`):
```python
class WaveformProvider(ABC):
    def list_waveforms(dataset_id: int) -> list[WaveformListItem]
    def get_preview(dataset_id: int, waveform_name: str) -> WaveformRecord | None
    def get_record(dataset_id, waveform_name, record_id, start_sample, num_samples) -> WaveformRecord | None
```

### 4.3 Core Models

- **WaveformRecord**: The standardized shape returned by all providers (samples list, channels, sampling rate, units, total_samples)
- **WaveformListItem**: Summary metadata for list views (name, sampling_rate_hz, units, start_column, end_column)

### 4.4 Service Layer

`WaveformService` statically resolves the provider based on `dataset.storage_format` and delegates all operations.

### 4.5 Frontend

`WaveformViewer.tsx` renders a waveform into a canvas. It calls `/waveforms/{waveform_name}/preview` for the first record or `/waveforms/{waveform_name}/record/{record_id}?start_sample=...&num_samples=...` for paged records.

---

## 5. Evaluation Pipeline

### 5.1 Output Contract

The SDK writes three files per run into the run's workspace directory:

```
workspace/experiments/experiment_{id}/run_{id}/
├── evaluation.parquet (required)
├── metrics.json       (optional)
└── artifacts.json     (optional)
```

- `evaluation.parquet`: Row-level predictions with columns:
  - `sample_id` (str|int) — primary key matching the dataset's `sample_id_column`
  - `ground_truth` (str|any)
  - `prediction` (str|any)
  - `confidence` (float, optional)
  - plus any additional columns produced by the SDK

- `metrics.json`: Aggregate metrics (e.g. accuracy, F1)
- `artifacts.json`: References to other files (checkpoints, plots)

### 5.2 EvaluationEngine (ABC)

Located in `backend/app/evaluation/base.py`:

```python
class EvaluationEngine(ABC):
    def query(filepath: str, filters: QueryFilters) -> QueryResult
    def compute_insights(filepath: str) -> Insights
    def get_row(filepath: str, index: int) -> dict
```

The current implementation is `PandasEvaluationEngine` which reads the parquet with pandas and applies filters in memory.

### 5.3 QueryFilters

- `preset`: "all" | "correct" | "incorrect" | "false_positive" | "false_negative"
- `ground_truth`: str | None
- `prediction`: str | None
- `confidence_min` / `confidence_max`: float | None
- `sample_id`: str | int | None
- `limit`: int (default 100)
- `offset`: int (default 0)

### 5.4 Insights

Aggregate statistics computed from `evaluation.parquet`:
- `accuracy`
- `correct/incorrect/false_positive/false_negative counts`
- `prediction_distribution` (value counts)
- `ground_truth_distribution` (value counts)
- `top_confusion_pairs` (most common GT->prediction mismatches)

---

## 6. Investigation Pipeline

### 6.1 Purpose

Investigation joins evaluation results with original dataset rows so researchers can inspect individual predictions in the context of full dataset features.

### 6.2 Flow

1. Researcher selects a run in the Investigation page.
2. Backend queries `evaluation.parquet` using `EvaluationEngine`.
3. For each evaluation row, if `sample_id` exists:
   - Load the parent `Experiment` → `Dataset`.
   - Read the CSV from `dataset.source_path`.
   - Match `sample_id` to `dataset.sample_id_column`.
   - Join the dataset row with the evaluation row.
4. Return `RowDetail(evaluation_row, dataset_row)` to the frontend.

### 6.3 Frontend Display

The Investigation page shows a table of evaluation rows with:
- Ground truth column
- Prediction column
- Confidence bar
- Correct/incorrect badge
- Expandable row detail showing joined dataset features

Waveform investigation is available inline when the dataset has waveform definitions.

---

## 7. SDK Relationship

### 7.1 Design Principle

> The platform never trains or infers. It indexes and investigates outputs.

The SDK is an **external package** that researchers use in their own training environments (local machines, GPU clusters, cloud). The platform never imports, installs, or calls the SDK.

### 7.2 Communication Channel

The **filesystem** is the sole contract between the SDK and the platform. The SDK writes to a known path, and the platform reads from it.

```
[Training Environment]                     [Platform Environment]
         │                                          │
         │  SDK writes evaluation.parquet           │
         ├─────────────────────────────────────────►│
         │  SDK writes metrics.json                 │
         ├─────────────────────────────────────────►│
         │  SDK writes artifacts.json               │
         ├─────────────────────────────────────────►│
         │                                          │
```

### 7.3 SDK Contract

The SDK must produce files in the runner's workspace directory. The platform discovers them via `OutputService.scan_output_directory()`. The frontend triggers `syncOutputs()` to force a re-scan.

### 7.4 Version Tracking

Runs store `sdk_version` to track compatibility. Future schema changes in `evaluation.parquet` can be gated on SDK version.

---

## 8. Design Philosophy

### 8.1 Core Principles

| Principle | Manifestation |
|-----------|---------------|
| **Modularity** | Clear boundaries between routers, services, repositories, specialists |
| **Separation of Concerns** | Each layer has exactly one reason to change |
| **Provider Pattern** | Adding a waveform format requires zero changes to service/router/frontend |
| **SDK Domain Agnostic** | Platform code never assumes a specific model architecture or framework |
| **Modality-Specific in Providers** | CSV vs WFDB logic is isolated in provider classes |
| **UI Through Services** | Frontend never touches the database directly — all reads go through API services |

### 8.2 Key Design Decisions

1. **Filesystem over API for outputs** — Large artifacts don't need an upload endpoint; they already exist on disk.
2. **No Dataset Copying** — Store the source path and parse once for metadata.
3. **No Authentication (MVP)** — Single-researcher local tool; auth adds complexity with no benefit.
4. **Zustand over Redux** — Zero boilerplate, no providers, no action types.
5. **SQLite for MVP** — Zero setup, single file, swappable to PostgreSQL later.
6. **SDK is External** — Different deployment environments, concerns, and constraints.

---

## 9. Extension Points

### 9.1 Adding a New Modality

1. Add modality string to `Dataset.modality` in `models/dataset.py`
2. Add modality handling to `DatasetService.register()` (choose appropriate reader)
3. Add reader in `readers/dataset_reader.py`
4. Update `DatasetCreate` / `DatasetUpdate` schemas if modality-specific fields are needed

### 9.2 Adding a New Waveform Provider

1. Implement `WaveformProvider` ABC in `backend/app/waveform/new_provider.py`
2. Add provider class file with full interface implementation
3. Register in `backend/app/waveform/__init__.py`:
   ```python
   ProviderRegistry.register("new_format", NewProvider)
   ```
4. Add frontend waveform viewer support if the provider returns new data shapes

### 9.3 Adding a New Visualization

1. Create a React page/component in `frontend/src/pages/` or `frontend/src/components/`
2. Add a Zustand store if complex state is needed
3. Connect via existing API module in `frontend/src/api/`
4. Add route in `frontend/src/App.tsx`

### 9.4 Adding a New Investigation Tool

1. Extend `backend/app/schemas/investigation.py` with new query/response types
2. Add method to `InvestigationService`
3. Add router endpoint(s) in `investigation/router.py`
4. Add extraction in `frontend/src/api/investigation.ts`
5. Build UI in `frontend/src/pages/Investigation.tsx`

### 9.5 Adding a New SDK Capability (Platform-Side)

1. Define output file contract (filename, schema)
2. Add detection logic in `OutputService.scan_output_directory()`
3. Add `output_type` column handling in `OutputRepository`
4. Add parsing, querying, or UI in a new or existing service/frontend page

### 9.6 Adding a New Artifact Type

1. Add `artifact_type` enum to `OutputRepository.get_by_run_and_type()` queries
2. Extend `artifacts.json` schema to include the new type
3. Add UI for the new artifact type in `RunDetail.tsx`

### 9.7 Adding a New Evaluation Output Format

1. Create a new `EvaluationEngine` implementation (e.g., `duckdb_engine.py`)
2. Implement the `EvaluationEngine` ABC
3. Update `config.py` to point to the new engine
4. Leave service layer, routers, and frontend unchanged

### 9.8 Adding a New Dataset Reader

1. Implement `DatasetReader` ABC in `backend/app/readers/new_reader.py`
2. Add instance to `_READERS` dict in `DatasetService`
3. Register modality string in `DatasetCreate` schema if needed

---

## 10. Workspace Layout

```
/Users/adarsh/Documents/internship_2026/platform2/research-os/  (repo root)
├── frontend/
│   └── src/
│       ├── api/          — Typed fetch wrappers
│       ├── stores/       — Zustand state (one per domain)
│       ├── pages/        — Route-level React components
│       ├── components/   — Shared UI components
│       └── theme/        — Tailwind tokens, colors, font stack
│
├── backend/
│   └── app/
│       ├── routers/      — FastAPI routers with DI
│       ├── services/     — Business logic orchestrators
│       ├── repositories/ — SQLAlchemy CRUD
│       ├── models/       — SQLAlchemy ORM models
│       ├── schemas/      — Pydantic models (request/response/domain)
│       ├── evaluation/   — EvaluationEngine ABC + pandas impl
│       ├── waveform/     — Provider pattern for waveform data
│       ├── readers/      — Dataset reader implementations
│       └── config.py     — Settings (workspace_root, database_url)
│
├── workspace/            — SDK output directory (git-ignored)
│   ├── experiments/
│   │   └── experiment_{id}/
│   │       └── run_{id}/
│   │           └── evaluation.parquet, metrics.json, artifacts.json
│
├── docs/
├── README.md
└── research_os.db       — SQLite database (git-ignored)
```

---

## 11. Component Hierarchy (Frontend)

```
App
 └── AppRoutes (React Router)
      ├── /datasets
      │    └── DatasetsPage
      │         └── DatasetList, DatasetCreateModal, DatasetDetailDrawer
      ├── /datasets/:id
      │    └── DatasetDetailPage
      │         ├── DatasetInfoPanel
      │         ├── ExperimentsTab (ExperimentsPage)
      │         └── WaveformViewer
      ├── /experiments/:id
      │    └── ExperimentDetailPage
      │         ├── ExperimentInfoPanel
      │         ├── RunsTab (RunsPage)
      │         └── InvestigationTab (InvestigationPage)
      └── /runs/:id
           └── RunDetailPage
                ├── RunInfoPanel
                ├── WaveformViewer
                └── RunEvaluationPage
```

---

## 12. Automatic Insights

`EvaluationEngine.compute_insights()` produces:

```python
Insights(
    accuracy=float | None,
    total_rows=int,
    correct_count=int,
    incorrect_count=int,
    false_positive_count=int,
    false_negative_count=int,
    prediction_distribution=dict[str, int] | None,
    ground_truth_distribution=dict[str, int] | None,
    top_confusion_pairs=list[dict] | None,
)
```

Insights are displayed in `RunEvaluation.tsx` without requiring additional API endpoints — they are computed on-demand from `evaluation.parquet`.

---

## 13. Future-Proofing Notes

### DuckDB Evaluation Engine (Large Datasets)
```python
# backend/app/evaluation/duckdb_engine.py
class DuckDBEvaluationEngine(EvaluationEngine):
    def query(...): ...
    def compute_insights(...): ...
    def get_row(...): ...
```
Change `config.py` to point to the new engine. No service/router/frontend changes required.

### PostgreSQL (Multi-User)
1. Change `database_url` in `config.py`
2. Add `User`/`Team` models
3. Add `user_id` foreign keys
4. Filter repositories by `user_id`

### Authentication
1. Add `User` model + JWT middleware
2. Router extracts `user_id` from token
3. Service receives `user_id` — no service layer changes to business logic

### File Uploads (HTTP Alternative)
```python
# POST /api/runs/{run_id}/outputs/upload
# Saves uploaded file to run's output directory
# Existing output scanning logic works unchanged
```

### Multiple Evaluation Files
1. Add `evaluation_file_id` param to investigation endpoints
2. Frontend file selector before investigation view
3. `EvaluationEngine.query()` already accepts `filepath`
