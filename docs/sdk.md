# SDK Integration

This document describes how the Research OS SDK (external package) integrates with the platform through the filesystem.

---

## 1. Overview

The SDK is an **external package** that researchers use in their training environments. The platform never imports, installs, or calls the SDK. Communication happens exclusively through the filesystem.

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

---

## 2. SDK Responsibilities

The SDK must produce standardised output files in the runner's workspace directory. Run metadata is provided when the run is created via the platform API.

### 2.1 Workspace Contract

The platform creates this directory when the run is created:

```
workspace/experiments/experiment_{id}/run_{id}/
```

The SDK writes into this directory. The platform scans it later to discover outputs.

---

## 3. Output File Formats

### 3.1 evaluation.parquet (required)

Row-level predictions. The platform reads this file to enable queries, insights, and investigation.

**Required columns:**
- `sample_id` — str or int, must match the dataset's `sample_id_column`
- `ground_truth` — the actual label
- `prediction` — the model's predicted label

**Optional columns:**
- `confidence` — float, the model's confidence in the prediction
- Any additional columns the SDK produces (e.g., `loss`, `entropy`, `logits`)

### 3.2 metrics.json (optional)

Aggregate computed metrics.

**Example:**
```json
{
  "accuracy": 0.9543,
  "f1_macro": 0.9401,
  "confusion_matrix": {"cat": {"cat": 120, "dog": 5, "bird": 3}}
}
```

### 3.3 artifacts.json (optional)

References to additional files produced by the SDK. The platform uses this to display artifact lists and enable downloads (future).

**Example:**
```json
{
  "checkpoints": ["model.pt", "tokenizer.json"],
  "plots": ["confusion_matrix.png", "roc_curve.png"],
  "logs": ["training.log"],
  "reports": ["prediction_errors.csv"]
}
```

---

## 4. Integration Pattern

### 4.1 Step 1 — Create the Run via API

The researcher creates a run before training:

```python
import requests

response = requests.post("http://localhost:8000/api/runs/", json={
    "experiment_id": 1,
    "model_name": "ResNet50",
    "hyperparameters": {"lr": "0.001", "batch_size": "32"},
    "git_commit": "abc123",
    "entry_point": "train.py"
})
run = response.json()
output_directory = run["output_directory"]
```

The platform returns the `output_directory` path where the SDK should write files.

### 4.2 Step 2 — Train and Evaluate

The SDK writes standardised files into `output_directory`:

```python
import pandas as pd
import json
from pathlib import Path

out_dir = Path(output_directory)

# evaluation.parquet
eval_df = pd.DataFrame({
    "sample_id": ["s001", "s002"],
    "ground_truth": ["cat", "dog"],
    "prediction": ["cat", "dog"],
    "confidence": [0.98, 0.87]
})
eval_df.to_parquet(out_dir / "evaluation.parquet")

# metrics.json
metrics = {"accuracy": 0.95, "f1_macro": 0.93}
(out_dir / "metrics.json").write_text(json.dumps(metrics))

# artifacts.json
artifacts = {
    "checkpoints": ["model.pt"],
    "plots": ["confusion_matrix.png"]
}
(out_dir / "artifacts.json").write_text(json.dumps(artifacts))
```

### 4.3 Step 3 — Notify the Platform

The researcher uses the platform UI to sync outputs, or calls the sync API:

```
POST /api/outputs/sync/{run_id}
```

The platform re-scans `output_directory` and registers the output files.

---

## 5. Version Tracking

Each run stores `sdk_version`. Researchers should include this field when creating runs:

```python
import research_os_sdk

response = requests.post("http://localhost:8000/api/runs/", json={
    "experiment_id": 1,
    "model_name": "MyModel",
    "sdk_version": research_os_sdk.__version__
})
```

This lets the platform gate new `evaluation.parquet` schema features on SDK version.

---

## 6. Lightweight SDK Usage (Minimal Example)

```python
def run_experiment(dataset_path, output_dir):
    import pandas as pd
    
    df = pd.read_csv(dataset_path)
    results = []
    
    for _, row in df.iterrows():
        # Your model here
        prediction = model.predict(row)
        confidence = float(prediction.max())
        
        results.append({
            "sample_id": row["id"],
            "ground_truth": row["label"],
            "prediction": str(prediction.argmax()),
            "confidence": confidence,
        })
    
    eval_df = pd.DataFrame(results)
    eval_df.to_parquet(f"{output_dir}/evaluation.parquet")
```

---

## 7. Future SDK Features

- Built-in `register_run()` and `write_evaluation()` helper functions
- Automatic `metrics.json` generation
- Validation of output schema before writing
- CLI entrypoint for common training loops
- Multi-run orchestration

For now, the SDK is just a spec. Any tool that writes the three contract files integrates with the platform.
