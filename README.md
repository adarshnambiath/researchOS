# Research OS

> A platform for indexing and investigating machine learning experiment outputs.

---

## 1. Project Overview

Research OS is a single-researcher tool for managing machine learning experiments. It never trains models or performs inference. Instead, it provides a structured workspace where an external SDK writes standardised output files, and the platform indexes and investigates those outputs.

---

## 2. Motivation

ML researchers run hundreds of experiments across datasets, models, and hyperparameters. Currently, investigating results means manually opening parquet files, notebooks, and logs. Research OS provides a unified UI for:
- Registering datasets
- Tracking experiments and runs
- Querying evaluation results
- Investigating incorrect predictions with context from original dataset rows
- Visualising waveform data

---

## 3. Core Concepts

| Concept | Description |
|---------|-------------|
| **Dataset** | Pointer to a CSV file the researcher owns. The platform never copies it. |
| **Experiment** | A research question tied to exactly one dataset. |
| **Run** | One execution attempt within an experiment. The platform records metadata and creates a workspace directory. |
| **Outputs** | Files produced by the SDK: evaluation.parquet, metrics.json, artifacts.json. |
| **Evaluation** | Querying row-level predictions from evaluation.parquet. |
| **Investigation** | Joining evaluation rows with original dataset rows to understand failures. |

---

## 4. High-Level Architecture

```
┌──────────────┐    ┌──────────────────┐    ┌──────────────────────┐
│  Researcher  │◄──►│  Backend API     │◄──►│  Frontend (React)    │
│ + SDK        │    │  (FastAPI)       │    │  (Vite + TypeScript) │
└──────┬───────┘    └────────┬─────────┘    └──────────────────────┘
       │                    │
       ▼                    ▼
┌─────────────────────────────────────────┐
│              Workspace (Filesystem)      │
│  workspace/experiments/experiment_{id}/  │
│             run_{id}/evaluation.parquet  │
└─────────────────────────────────────────┘
```

The SDK writes to the filesystem. The platform reads from it. They never call each other directly.

---

## 5. Current Features

- Dataset registration and preview (tabular CSV and ECG/WFDB)
- Experiment and run lifecycle management
- Automatic workspace directory creation
- Output file discovery and sync
- Evaluation parquet querying with filters and insights
- Investigation with dataset cross-referencing
- Waveform viewer (CSV column ranges and WFDB records)
- Lightweight filesystem-based SDK contract

---

## 6. Repository Structure

```
frontend/
  src/
    api/          - Typed fetch wrappers
    stores/       - Zustand state (one per domain)
    pages/        - Route-level React components
    components/   - Shared UI components
    theme/        - Tailwind tokens

backend/
  app/
    routers/      - FastAPI routers
    services/     - Business logic
    repositories/ - SQLAlchemy CRUD
    models/       - ORM models
    schemas/      - Pydantic models
    evaluation/   - Evaluation engine ABC + pandas impl
    waveform/     - Waveform provider pattern
    readers/      - Dataset reader implementations
    config.py     - Settings

workspace/        - SDK output directory
docs/             - Detailed documentation
```

---

## 7. Quick Start

```bash
# Clone the repository
git clone https://github.com/adarshnambiath/researchOS.git
cd researchOS

# Install backend dependencies
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Install frontend dependencies
cd ../frontend
npm install
```

---

## 8. Running Frontend

```bash
cd frontend
npm run dev
```

Opens at http://localhost:5173.

**Frontend Stack**
- React + Vite + TypeScript
- TailwindCSS (light theme, dense layout)
- Zustand for state management
- React Router for client-side navigation

---

## 9. Running Backend

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

Backend runs at http://localhost:8000.

**Environment Variables** (backend/.env):
```env
DATABASE_URL=sqlite:///./research_os.db
WORKSPACE_ROOT=/absolute/path/to/research-os/workspace
```

---

## 10. Workspace Layout

```
workspace/
├── experiments/
│   └── experiment_{id}/
│       └── run_{id}/
│           ├── evaluation.parquet   (required)
│           ├── metrics.json         (optional)
│           └── artifacts.json       (optional)
```

The platform creates experiment_{id}/run_{id}/ when a run is created. The SDK writes outputs into it.

---

## 11. SDK Integration

The SDK is an **external package**. The platform never imports it. Communication happens exclusively through the filesystem.

**Output contract:**
- evaluation.parquet — row-level predictions (columns: sample_id, ground_truth, prediction, confidence)
- metrics.json — aggregate metrics
- artifacts.json — references to checkpoints, plots, logs

See [docs/sdk.md](docs/sdk.md) for the full integration spec.

---

## 12. Documentation Index

| Document | Description |
|----------|-------------|
| [docs/architecture.md](docs/architecture.md) | Full system architecture, backend layers, waveform subsystem, extension points |
| [docs/sdk.md](docs/sdk.md) | SDK integration contract, output formats, integration patterns |
| [docs/datasets.md](docs/datasets.md) | Dataset registration, schema inference, modalities, preview |
| [docs/waveforms.md](docs/waveforms.md) | Waveform subsystem, provider interface, CSV and WFDB providers |
| [docs/evaluation.md](docs/evaluation.md) | Evaluation parquet schema, query filters, metrics, insights |
| [docs/investigation.md](docs/investigation.md) | Investigation pipeline, dataset cross-referencing, waveform investigation |
| [docs/development.md](docs/development.md) | How to add features, where code belongs, conventions |
| [docs/roadmap.md](docs/roadmap.md) | Future direction, known limitations, medium-term goals |

---

## 13. Status

- **Phase:** MVP / Phase 1
- **Last updated:** 2026-07-01

Core concepts are stable. The architecture diagram is complete. Waveform subsystem and investigation pipeline are functional.

For contributions, see [docs/development.md](docs/development.md).
