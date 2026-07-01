# Research OS — Architecture Document

> **Status:** MVP / Phase 1  
> **Last updated:** 2026-07-01

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Why This Architecture?](#why-this-architecture)
3. [Project Folder Structure](#project-folder-structure)
4. [Backend Architecture](#backend-architecture)
5. [Frontend Architecture](#frontend-architecture)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Workspace Organization](#workspace-organization)
9. [Component Hierarchy](#component-hierarchy)
10. [The Evaluation Query Layer](#the-evaluation-query-layer)
11. [Automatic Insights](#automatic-insights)
12. [Design Decisions](#design-decisions)
13. [Future-Proofing Notes](#future-proofing-notes)

---

## Core Philosophy

Research OS never trains models.

Research OS never performs inference.

Training happens entirely in the researcher's own environment.

The SDK standardizes experiment outputs.

The platform indexes those outputs.

The platform investigates those outputs.

The filesystem is the contract between the SDK and the platform.

Everything in the application reinforces this philosophy.

---



## Core Concepts

### Dataset

A **dataset** is a pointer to a CSV file that the researcher already owns. The platform never copies the dataset. On registration, the platform reads the CSV once to extract row count, column names, inferred types, schema, and a 20-row preview. This metadata is stored in the database. The original file remains at its source path.

Key attributes:
- `name`, `description`, `modality` — researcher-defined labels
- `source_path` — absolute path to the CSV
- `label_column`, `sample_id_column` — optional semantic columns
- Parsed metadata: `row_count`, `columns_json`, `dtypes_json`, `schema_json`, `preview_json`

### Experiment

An **experiment** represents a research question. It belongs to exactly one dataset because the investigation phase needs to cross-reference evaluation rows with original dataset rows by sample ID.

Key attributes:
- `name`, `description`, `objective` — researcher-defined
- `task` — e.g. "classification", "regression"
- `dataset_id` — foreign key to the dataset

### Run

A **run** is one execution attempt within an experiment. It captures metadata about what was done. The platform does not execute the run — it only records metadata. On creation, the platform automatically creates `workspace/runs/run_<id>/` and stores that path.

Key attributes:
- `model_name`, `notes`, `seed`
- `git_commit`, `repository_url`, `entry_point` — provenance
- `hyperparameters_json` — arbitrary key-value pairs
- `output_directory` — the auto-created workspace path

### Outputs

**Outputs** are files produced outside the platform. The platform stores their paths and metadata but never touches their content until the investigation phase. Three file types form the contract between the SDK and the platform:

| File | Purpose |
|------|---------|
| `evaluation.parquet` | Row-level predictions with ground truth, predictions, confidence, sample_id |
| `metrics.json` | Aggregate metrics (accuracy, F1, etc.) |
| `artifacts.json` | References to any other files (checkpoints, logs, plots) |

### Investigation

**Investigation** is the heart of the product. The platform reads `evaluation.parquet` and lets the researcher query: all rows, correct predictions, incorrect predictions, false positives, false negatives, by ground truth/prediction value, by confidence range, and by sample ID. When a row is clicked, the platform shows the evaluation row alongside the original dataset row (matched by `sample_id_column`).

---

## Why This Architecture?

### 1. Separation of concerns (layered backend)

The backend uses five layers: **models → schemas → repositories → services → routers**. Each layer has one job:

- **Models** map database tables to Python objects. No logic.
- **Schemas** validate and shape API data. No logic.
- **Repositories** encapsulate database queries. No business decisions.
- **Services** contain all business logic. No HTTP concerns.
- **Routers** wire HTTP to services. No business logic.

This makes the system testable (services and repositories can be tested without HTTP), replaceable (swap SQLite for Postgres by changing the repository layer), and navigable.

### 2. Abstract evaluation engine

The investigation feature reads Parquet/CSV files and runs filter queries. This is the only part of the system that touches a data processing library. By placing it behind an abstract interface (`EvaluationEngine`), we can swap Pandas for DuckDB without changing any service or router code.

### 3. Workspace-first output management

Rather than asking researchers to upload files through a form, we give them a known directory path. They (or the SDK) place files there. The platform reads from the filesystem. This avoids HTTP uploads of potentially large files, works with the existing SDK, and keeps the researcher in control of their data.

### 4. No dataset duplication

CSV files can be gigabytes. Copying them into a platform-owned storage creates sync problems, wastes disk space, and violates the principle that researchers own their data. Storing an absolute path is simpler, faster, and more honest.

---

## Project Folder Structure

```
research-os/
├── ARCHITECTURE.md                 # This document
├── README.md                       # Project overview + quick start
├── .gitignore                      # Ignore venv, node_modules, workspace, .db
│
├── backend/
│   ├── .venv/                      # Python virtual environment (ignored)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app creation, lifespan, router includes
│   │   ├── database.py             # Engine, SessionLocal, Base, get_db dependency
│   │   ├── config.py               # Settings via pydantic-settings
│   │   │
│   │   ├── models/                 # SQLAlchemy ORM models
│   │   │   ├── __init__.py
│   │   │   ├── dataset.py
│   │   │   ├── experiment.py
│   │   │   ├── run.py
│   │   │   └── output.py
│   │   │
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   │   ├── __init__.py
│   │   │   ├── dataset.py
│   │   │   ├── experiment.py
│   │   │   ├── run.py
│   │   │   └── output.py
│   │   │
│   │   ├── repositories/           # Data access layer
│   │   │   ├── __init__.py
│   │   │   ├── base.py             # Generic CRUD mixin
│   │   │   ├── dataset_repository.py
│   │   │   ├── experiment_repository.py
│   │   │   ├── run_repository.py
│   │   │   └── output_repository.py
│   │   │
│   │   ├── services/               # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── dataset_service.py
│   │   │   ├── experiment_service.py
│   │   │   ├── run_service.py
│   │   │   ├── output_service.py
│   │   │   └── investigation_service.py
│   │   │
│   │   ├── routers/                # Thin HTTP handlers
│   │   │   ├── __init__.py
│   │   │   ├── datasets.py
│   │   │   ├── experiments.py
│   │   │   ├── runs.py
│   │   │   ├── outputs.py
│   │   │   └── investigation.py
│   │   │
│   │   └── evaluation/             # Replaceable query engine
│   │       ├── __init__.py
│   │       ├── base.py             # Abstract base class
│   │       └── pandas_engine.py    # Pandas implementation
│   │
│   └── requirements.txt
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── eslint.config.js
│   │
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   │
│   └── src/
│       ├── main.tsx                # React entry point
│       ├── App.tsx                 # Router setup, layout wrapper
│       ├── index.css               # Tailwind CSS v4 import + global styles
│       │
│       ├── api/                    # Axios client + endpoint modules
│       │   ├── client.ts           # Axios instance with baseURL
│       │   ├── datasets.ts
│       │   ├── experiments.ts
│       │   ├── runs.ts
│       │   ├── outputs.ts
│       │   └── investigation.ts
│       │
│       ├── stores/                 # Zustand state stores
│       │   ├── datasetStore.ts
│       │   ├── experimentStore.ts
│       │   └── runStore.ts
│       │
│       ├── components/             # Reusable UI components
│       │   ├── Layout.tsx          # Application shell
│       │   ├── Sidebar.tsx         # Navigation sidebar
│       │   ├── TopBar.tsx          # Top bar with breadcrumbs
│       │   ├── DataTable.tsx       # Generic table component
│       │   ├── CodeBlock.tsx       # Syntax-highlighted code snippet
│       │   ├── Modal.tsx           # Slide-over / modal for row detail
│       │   └── EmptyState.tsx      # Empty state placeholder
│       │
│       ├── pages/                  # Route-level page components
│       │   ├── Home.tsx
│       │   ├── Datasets.tsx
│       │   ├── DatasetDetail.tsx
│       │   ├── Experiments.tsx
│       │   ├── ExperimentDetail.tsx
│       │   ├── Runs.tsx
│       │   ├── RunDetail.tsx
│       │   └── Investigation.tsx
│       │
│       └── lib/                    # Utility functions
│           ├── format.ts           # Number/date formatting helpers
│           └── constants.ts        # API base URL, route paths
│
└── workspace/                      # Local workspace (gitignored)
    ├── datasets/                   # Empty — reserved for future use
    ├── experiments/                # Empty — reserved for future use
    └── runs/
        └── run_<id>/               # Created automatically per run
            └── (researcher places evaluation.parquet, metrics.json, artifacts.json here)
```

---

## Backend Architecture

### Layer Responsibilities

```
HTTP Request
    |
    v
+--------------------------------------------------------------------+
|                    Router (thin)                                    |
|  o Parse path/query params                                         |
|  o Validate request body (schemas)                                 |
|  o Call service method                                             |
|  o Return response (schemas)                                       |
+----------------------------------+---------------------------------+
                                   |
                                   v
+--------------------------------------------------------------------+
|                    Service (business logic)                         |
|  o Orchestrate repositories                                        |
|  o Handle filesystem operations (create dirs, read CSVs)           |
|  o Compute insights from evaluation files                          |
|  o Raise domain-specific errors                                    |
|  o No HTTP or DB knowledge                                         |
+----------------------------------+---------------------------------+
                                   |
                                   v
+--------------------------------------------------------------------+
|                    Repository (data access)                         |
|  o Build SQLAlchemy queries                                        |
|  o Return ORM objects or None                                      |
|  o No business logic                                               |
+----------------------------------+---------------------------------+
                                   |
                                   v
+--------------------------------------------------------------------+
|                    Models (ORM mapping)                             |
|  o Define tables, columns, relationships                           |
|  o No methods beyond __repr__                                      |
+--------------------------------------------------------------------+
```

### Config (`config.py`)

A single `Settings` class using `pydantic-settings` that reads from environment variables or defaults:

```python
class Settings(BaseSettings):
    database_url: str = "sqlite:///./research_os.db"
    workspace_root: str = str(Path(__file__).parent.parent.parent / "workspace")
```

### Database (`database.py`)

SQLAlchemy session factory with `get_db` FastAPI dependency. Uses SQLite for MVP (no separate server needed). The `check_same_thread=False` connection arg is set for SQLite compatibility with FastAPI's threading model.

### Models Overview

Four models: `Dataset`, `Experiment`, `Run`, `Output`. Each has auto-increment integer primary keys, `created_at` timestamps, and foreign key relationships:

```
Dataset --1:N--> Experiment --1:N--> Run --1:N--> Output
```

### Error Handling

Services raise custom exception classes (e.g., `DatasetNotFoundError`, `RunNotFoundError`). A global FastAPI exception handler converts these to structured JSON error responses. This keeps error handling consistent without try/except in routers.

---

## Frontend Architecture

### Routing

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `Home` | Recent activity summary |
| `/datasets` | `Datasets` | Table of all datasets |
| `/datasets/:id` | `DatasetDetail` | Schema, preview, linked experiments |
| `/experiments` | `Experiments` | Table of all experiments |
| `/experiments/:id` | `ExperimentDetail` | Metadata, linked runs |
| `/runs` | `Runs` | Table of all runs |
| `/runs/:id` | `RunDetail` | Metadata, SDK integration, outputs, investigation |
| `/runs/:runId/investigate` | `Investigation` | Query evaluation.parquet, view insights |

### State Management (Zustand)

Three domain stores. Each store follows the same pattern:

```typescript
interface DomainStore<T> {
  items: T[];
  selectedItem: T | null;
  loading: boolean;
  error: string | null;
  fetchAll: () => Promise<void>;
  fetchById: (id: number) => Promise<void>;
  create: (data: CreatePayload) => Promise<void>;
  remove: (id: number) => Promise<void>;
}
```

No global store. No cross-store dependencies. If a page needs data from multiple domains, each domain's store is called independently.

### API Layer

A single Axios instance (`api/client.ts`) with `baseURL: "http://localhost:8000/api"`. Each domain has a dedicated API module that imports the client and exports typed functions.

### UI Philosophy

- **Minimal, light theme** — no glassmorphism, no gradients, no giant cards
- **Dense information** — tables and lists over dashboard widgets
- **Consistent spacing** — 4px grid, 32px section padding
- **Professional typography** — system-ui, 14px body, 12px code
- **Every screen answers a question** — "What happened?", "What changed?", "What should I investigate?"

---

## Database Schema

### Dataset

```sql
CREATE TABLE datasets (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    description     TEXT,
    modality        TEXT NOT NULL DEFAULT 'tabular',
    source_path     TEXT NOT NULL,
    label_column    TEXT,
    sample_id_column TEXT,
    row_count       INTEGER NOT NULL DEFAULT 0,
    columns_json    TEXT,
    dtypes_json     TEXT,
    schema_json     TEXT,
    preview_json    TEXT,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Experiment

```sql
CREATE TABLE experiments (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id      INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    objective       TEXT,
    task            TEXT NOT NULL DEFAULT 'classification',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Run

```sql
CREATE TABLE runs (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    experiment_id       INTEGER NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    model_name          TEXT NOT NULL,
    notes               TEXT,
    seed                INTEGER,
    git_commit          TEXT,
    repository_url      TEXT,
    entry_point         TEXT,
    hyperparameters_json TEXT,
    output_directory    TEXT,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Output

```sql
CREATE TABLE outputs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id          INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,
    filename        TEXT NOT NULL,
    file_path       TEXT NOT NULL,
    file_size       INTEGER DEFAULT 0,
    uploaded_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Endpoints

### Datasets

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/datasets` | Register a dataset (multipart with CSV file + metadata). Parses CSV, stores metadata, does NOT copy. |
| `GET` | `/api/datasets` | List all datasets. |
| `GET` | `/api/datasets/{id}` | Get dataset details including schema and preview. |
| `DELETE` | `/api/datasets/{id}` | Remove dataset registration. Does NOT delete source file. |

### Experiments

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/experiments` | Create an experiment under a dataset. |
| `GET` | `/api/experiments` | List all experiments. Optional `?dataset_id=` filter. |
| `GET` | `/api/experiments/{id}` | Get experiment details with run count. |
| `DELETE` | `/api/experiments/{id}` | Delete experiment and cascade to its runs. |

### Runs

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/runs` | Create a run. Auto-creates workspace/runs/run_<id>/ directory. |
| `GET` | `/api/runs` | List all runs. Optional `?experiment_id=` filter. |
| `GET` | `/api/runs/{id}` | Get run details including output directory. |
| `DELETE` | `/api/runs/{id}` | Delete run and its output directory. |

### Outputs

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/runs/{id}/outputs` | List outputs attached to a run. |
| `POST` | `/api/runs/{id}/outputs/sync` | Scan run directory and register recognized files as outputs. |
| `DELETE` | `/api/outputs/{id}` | Remove output registration (does not delete file). |

### Investigation

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/runs/{runId}/investigation/query` | Query evaluation file with filters. Returns matching rows. |
| `POST` | `/api/runs/{runId}/investigation/row/{index}` | Get evaluation row + dataset row detail. |
| `POST` | `/api/runs/{runId}/investigation/insights` | Compute automatic insights from evaluation file. |

---

## Workspace Organization

```
workspace/
├── datasets/              # Reserved — currently unused
├── experiments/           # Reserved — currently unused
└── runs/
    └── run_<id>/          # One directory per run, created on run creation
        ├── evaluation.parquet   # Placed by researcher / SDK
        ├── metrics.json         # Placed by researcher / SDK
        └── artifacts.json       # Placed by researcher / SDK
```

The workspace is at the project root. The path is configurable via `WORKSPACE_ROOT` env var. The platform scans run directories for recognized file types. It does NOT write to these directories — the researcher (or SDK) is responsible for placing files.

---

## Component Hierarchy

```
<App>
  <BrowserRouter>
    <Layout>
      +-- <Sidebar>
      |     +-- Logo + app name
      |     +-- NavItem: Home (/)
      |     +-- NavItem: Datasets (/datasets)
      |     +-- NavItem: Experiments (/experiments)
      |     +-- NavItem: Runs (/runs)
      |
      +-- <TopBar>
      |     +-- Breadcrumb (context-dependent)
      |
      +-- <main>  <- React Router <Outlet />
            +-- <Home>
            |     +-- RecentDatasets (last 5)
            |     +-- RecentExperiments (last 5)
            |     +-- RecentRuns (last 5)
            |
            +-- <Datasets>  <- list view
            |     +-- <DataTable> with create button
            |
            +-- <DatasetDetail>
            |     +-- Dataset metadata panel
            |     +-- Schema preview (column name + type table)
            |     +-- Data preview (first 20 rows)
            |     +-- Linked experiments list
            |
            +-- <Experiments>  <- list view
            |     +-- <DataTable> with create button
            |
            +-- <ExperimentDetail>
            |     +-- Experiment metadata panel
            |     +-- Runs list with link to create new run
            |
            +-- <Runs>  <- list view
            |     +-- <DataTable>
            |
            +-- <RunDetail>
            |     +-- Run metadata panel
            |     +-- SDK Integration section
            |     |     +-- Output directory path
            |     |     +-- Copyable Python code snippet
            |     |     +-- Explanation of evaluation.parquet / metrics.json / artifacts.json
            |     +-- Outputs section
            |     |     +-- List of recognized output files
            |     +-- Investigation section (if evaluation.parquet exists)
            |           +-- Button: "Investigate >"
            |
            +-- <Investigation>
                  +-- Insights summary bar (accuracy, counts, distributions)
                  +-- Filter bar (dropdown for all/correct/incorrect/fp/fn, confidence slider, sample ID input)
                  +-- Results table
                        +-- Row click -> <Modal> with:
                              +-- Evaluation row detail
                              +-- Dataset row detail (if sample IDs match)
```

---

## The Evaluation Query Layer

The evaluation module (`backend/app/evaluation/`) implements a replaceable query engine. This is the only part of the system that couples to a data processing library.

### Interface (`base.py`)

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Literal


@dataclass
class QueryFilters:
    filter_type: Literal["all", "correct", "incorrect", "false_positive", "false_negative"] = "all"
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


@dataclass
class Insights:
    accuracy: float | None
    total_rows: int
    correct_count: int
    incorrect_count: int
    false_positive_count: int
    false_negative_count: int
    prediction_distribution: dict
    ground_truth_distribution: dict
    top_confusion_pairs: list[tuple]


class EvaluationEngine(ABC):
    @abstractmethod
    def query(self, filepath: str, filters: QueryFilters) -> QueryResult: ...

    @abstractmethod
    def compute_insights(self, filepath: str) -> Insights: ...

    @abstractmethod
    def get_row(self, filepath: str, index: int) -> dict: ...
```

### Pandas Implementation (`pandas_engine.py`)

The initial implementation uses Pandas to load the Parquet file into a DataFrame and run filter operations:

- `query()` — applies filters via boolean masking, returns sliced result
- `compute_insights()` — computes accuracy, confusion matrix, distributions
- `get_row()` — returns a single row by iloc index

### Why Abstract?

Pandas loads the entire Parquet file into memory. For files with millions of rows, this becomes slow or impossible. DuckDB can push filters down to the file level and handle larger-than-memory datasets. By defining an interface now, we can swap implementations later without changing the investigation service, the router, or the frontend.

---

## Automatic Insights

The platform always computes insights from the evaluation file. The researcher never enters them manually.

### Computed Metrics

| Insight | Source | Computation |
|---------|--------|-------------|
| Accuracy | evaluation.parquet | `(correct / total) * 100` |
| Correct / Incorrect counts | evaluation.parquet | Boolean mask on `ground_truth == prediction` |
| False Positives count | evaluation.parquet | `(prediction == positive) & (ground_truth != positive)` |
| False Negatives count | evaluation.parquet | `(prediction != positive) & (ground_truth == positive)` |
| Prediction distribution | evaluation.parquet | Value counts on `prediction` column |
| Ground truth distribution | evaluation.parquet | Value counts on `ground_truth` column |
| Top confusion pairs | evaluation.parquet | Group by `(ground_truth, prediction)`, sort desc, take top N |

### Expected Evaluation Schema

The evaluation.parquet file must contain at minimum these columns:

| Column | Type | Description |
|--------|------|-------------|
| `sample_id` | int/str (optional) | Matches dataset's sample_id_column |
| `ground_truth` | any | The true label |
| `prediction` | any | The model's prediction |
| `confidence` | float (optional) | Model confidence (0-1) |

Additional columns are preserved and displayed in the investigation UI.

---

## Design Decisions

### 1. Layered Backend (not flat)

**Decision:** Five explicit layers (models -> schemas -> repositories -> services -> routers).

**Why:** This is a greenfield project. Building clean layers from the start costs minimal time but pays dividends as the system grows. Services are testable in isolation. Routers are trivially replaceable if we switch from REST to GraphQL or gRPC. Repositories isolate us from SQLAlchemy API changes.

### 2. Abstract Evaluation Engine (not raw pandas)

**Decision:** Define an abstract `EvaluationEngine` class, implement initially with Pandas.

**Why:** The spec explicitly warns against coupling to pandas. The interface costs ~30 lines of code now. If evaluation files grow to millions of rows, swapping to DuckDB requires only a new implementation class and a config change.

### 3. Workspace Directory (not database blob storage)

**Decision:** Create per-run directories on the filesystem. Store paths in the database. Never upload through HTTP.

**Why:** Evaluation files can be hundreds of megabytes. HTTP uploads are slow and fragile. The SDK already writes to the filesystem. Reading from a known path is instant. The researcher retains full control of their files.

### 4. No Dataset Copying

**Decision:** Store the absolute source path. Parse once for metadata. Never copy.

**Why:** Researchers own their data. Copying creates sync problems, wastes disk, and implies ownership transfer. The path is sufficient for the investigation phase (we read the dataset row by sample_id from the original CSV).

### 5. No Authentication (for MVP)

**Decision:** No auth, no users, no teams.

**Why:** This is a single-researcher local tool. Auth adds complexity (sessions, tokens, login UI, password storage) with zero benefit for the MVP. Auth can be added later behind a feature flag.

### 6. Zustand over Redux

**Decision:** One Zustand store per domain, no global store.

**Why:** Zustand has no boilerplate, no providers, no action types. For an app with three domain entities, a full Redux setup would be overengineering.

### 7. Light Theme, Dense UI

**Decision:** Professional light theme. Dense tables. No decorative effects.

**Why:** Research tools should feel like workspaces, not marketing pages. Light theme works better in well-lit office/lab environments. Dense information layout (tables, lists, code blocks) matches how researchers actually work.

### 8. SQLite for MVP

**Decision:** SQLite database file at project root.

**Why:** Zero setup. No server. The database is a single file that can be versioned, backed up, or deleted. If the platform needs concurrent multi-user access later, swap SQLAlchemy's database URL to PostgreSQL.

### 9. SDK is External

**Decision:** The SDK is a separate package. The platform never imports or calls it.

**Why:** The platform and the SDK have different concerns. The SDK runs in the researcher's training environment (possibly a GPU cluster with no internet). The platform runs on the researcher's local machine. They communicate through the filesystem.

---

## Future-Proofing Notes

### DuckDB Evaluation Engine

When evaluation files grow beyond memory or query performance becomes critical:

1. Create `backend/app/evaluation/duckdb_engine.py` implementing `EvaluationEngine`
2. Change the `config.py` to point to the new engine
3. The service layer, routers, and frontend remain unchanged

### PostgreSQL Support

When multi-user access is needed:

1. Install `psycopg2` or `asyncpg`
2. Change `database_url` in config from `sqlite:///...` to `postgresql://...`
3. Add connection pool settings
4. Models and repositories remain unchanged
5. Add user/team models and auth middleware

### Authentication

When auth is needed:

1. Add `User` and `Team` models
2. Add JWT-based auth middleware
3. Add user_id foreign keys to Dataset, Experiment, Run
4. Add filter conditions to repositories
5. Add login/signup UI
6. The service layer remains unchanged — it receives a `user_id` from the router

### File Uploads (HTTP)

If researchers need to upload files through the browser instead of using the filesystem:

1. Add a `POST /api/runs/{id}/outputs/upload` endpoint
2. The service saves the uploaded file to the run's output directory
3. The existing output reading logic works unchanged

### Multiple Evaluation Files

If a run produces multiple evaluation files (e.g., per-class evaluations):

1. Add an `evaluation_file_id` to investigation endpoints
2. The frontend shows a file selector before the investigation view
3. The evaluation engine interface already accepts a filepath parameter
