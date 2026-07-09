# Roadmap

This document describes the future direction of Research OS, known limitations, and medium-term goals.

---

## 1. Current Phase

**Phase 1 (MVP)** — Core features complete:
- Dataset registration and preview
- Experiment and run lifecycle
- Output discovery and sync
- Evaluation querying and insights
- Investigation with dataset cross-referencing
- Waveform viewer (CSV and WFDB)
- Filesystem-based SDK contract

---

## 2. Known Limitations

### 2.1 Data Scale

- **Evaluation files must fit in memory.** Pandas reads the entire parquet file into RAM. For files > 1 GB, queries will be slow or crash.
- **Dataset reads per row detail.** `InvestigationService` reads the full CSV for every `RowDetail` request. For datasets with 100k+ rows, this is O(N) per click.
- **No dataset caching.** The platform re-reads dataset CSVs on every investigation request. A TTL cache would improve latency.

### 2.2 Collaboration

- **No user accounts or teams.** The platform is single-user, local.
- **No access control.** All data is accessible to anyone with filesystem access.
- **No sharing.** Results cannot be shared remotely (MVP constraint).

### 2.3 SDK

- **SDK not released.** The contract exists but no external package implements it yet.
- **No automatic output writing.** Researchers must manually write parquet/metrics/artifacts files.
- **No validation.** The platform does not validate output schemas; bad parquet columns cause runtime errors.

### 2.4 Frontend

- **Dense data only.** No rich visualisations (scatter plots, histograms, calibration curves).
- **Single waveform channel.** Multi-channel recordings default to the first channel.
- **No dark mode.** Light theme only.

---

## 3. Medium-Term Goals (Phase 2)

### 3.1 Performance

- **DuckDB evaluation engine** for large parquet files and SQL-based filtering.
- **Dataset DataFrame caching** (TTL-based) for investigation.
- **Columnar dataset reads** using `pandas.read_csv(usecols=...)` to avoid loading unused columns.

### 3.2 SDK Package

- Publish `research-os-sdk` on PyPI.
- Built-in helpers for evaluation writing, metrics computation, and run registration.
- Automatic SDK version tracking in run metadata.
- CLI entrypoint for common training/evaluation workflows.

### 3.3 Collaboration

- PostgreSQL support for multi-user access.
- User and team models.
- JWT-based authentication.
- Workspace isolation per user/team.
- Optional file upload endpoint for cloud environments (FILES API).

### 3.4 Visualisations

- Interactive confusion matrix plot.
- Per-class precision/recall/F1 breakdown.
- Confidence distribution histogram.
- Calibration curve for probability outputs.
- Error analysis scatter plot (confidence vs correctness).

### 3.5 Investigation

- Batch row detail endpoint (reduce round-trips for table detail).
- Dataset column selection (investigator chooses which columns to display).
- Time-range waveform slicing for long recordings.
- Multi-record waveform comparison.

---

## 4. Long-Term Goals (Phase 3)

### 4.1 Model Registry

- Versioned model registry alongside experiment/runs.
- Model lineage tracking (which run produced which model file).
- Model comparison tools.

### 4.2 Experiment Management

- Hyperparameter search tracking.
- Experiment cloning and reuse.
- Automated experiment suggestions based on previous results.

### 4.3 Integration Ecosystem

- MLflow integration for experiment tracking.
- Weights & Biases sync adapter.
- HuggingFace Hub integration for model sharing.
- Docker recipe generation for reproducible training.

### 4.4 Cloud Deployment

- Optional cloud backend (S3 for outputs, RDS for metadata).
- Self-hosted SaaS deployment guide.
- Multi-tenant workspace isolation.

---

## 5. Under Consideration

- **Time-series dataset support** (uneven sampling, irregular intervals).
- **Audio and video modalities** with provider-specific waveform viewers.
- **Active learning integration** (submit uncertain samples for labelling).
- **A/B test framework** for comparing multiple runs on the same task.
- **Report generation** (PDF/HTML export of experiment results).
- **SQLite WAL mode** for improved concurrent read performance.

---

## 6. What We Will Not Build

- **Training infrastructure.** Training stays in the researcher's environment.
- **Model hosting or inference.** The platform indexes and investigates, not serves.
- **GPU scheduling.** Orthogonal to the problem space.
- **Full Jupyter replacement.** Notebooks remain the standard for exploratory analysis.

---

## 7. How to Contribute

### 7.1 Good First Issues

Look for issues tagged `good-first-issue`:
- Adding a new waveform provider (EDF, DICOM)
- Adding a new dataset reader (Parquet, Feather)
- Adding a new frontend visualisation
- Improving error messages in investigation

### 7.2 Checklist Before Adding a Feature

1. Does it fit in one of the documented layers?
2. Does it require changes to the SDK contract?
3. Does it break backward compatibility with existing output files?
4. Is there a test plan?
5. Is the documentation updated?

If the answer to any of these is "I don't know", ask before coding.

---

## 8. Research OS Principles

1. **Never train.** The platform is not an ML training framework.
2. **Filesystem is the contract.** The SDK and platform communicate through files, not APIs.
3. **Modality-agnostic core.** Core logic knows nothing about ECG, image, or text.
4. **Extensibility over completeness.** Better to have a clean provider interface that anyone can extend than a monolithic format handler.
