import json
import os

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories.run_repository import RunRepository

router = APIRouter(prefix="/api/runs/{run_id}", tags=["sdk-visualization"])


def get_run_repo(db: Session = Depends(get_db)) -> RunRepository:
    return RunRepository(db)


@router.get("/evaluation")
def get_evaluation(
    run_id: int,
    search: str | None = Query(None),
    sort_column: str | None = Query(None),
    sort_direction: str | None = Query(None, pattern="^(asc|desc)$"),
    filter_column: str | None = Query(None),
    filter_value: str | None = Query(None),
    true_label: str | None = Query(None),
    predicted_label: str | None = Query(None),
    limit: int = Query(100, ge=1, le=10_000),
    offset: int = Query(0, ge=0),
    run_repo: RunRepository = Depends(get_run_repo),
):
    """Read evaluation.parquet from the run's output directory.

    Supports server-side search, filtering, sorting, and confusion-matrix
    filtering. Returns paginated rows so the frontend never loads the entire
    parquet file at once.
    """
    run = run_repo.get_by_id(run_id)
    if not run or not run.output_directory:
        raise HTTPException(status_code=404, detail="Run not found or missing output directory")

    path = os.path.join(run.output_directory, "evaluation.parquet")
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="evaluation.parquet not found")

    try:
        df = pd.read_parquet(path)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read evaluation.parquet: {exc}")

    if df.empty:
        columns = [str(c) for c in df.columns]
        return {
            "columns": columns,
            "rows": [],
            "total": 0,
            "offset": offset,
            "limit": limit,
        }

    # 1. Global search across every column (case-insensitive substring)
    if search:
        search_norm = search.lower()
        mask = pd.Series([False] * len(df), index=df.index)
        for col in df.columns:
            mask = mask | df[col].astype(str).str.lower().str.contains(search_norm, na=False, regex=False)
        df = df[mask]

    # 2. Column-specific filtering
    if filter_column and filter_value and filter_column in df.columns:
        fv = filter_value.lower()
        df = df[df[filter_column].astype(str).str.lower().str.contains(fv, na=False, regex=False)]

    # 3. Confusion matrix filtering
    if true_label is not None or predicted_label is not None:
        true_col = next((c for c in df.columns if c.lower() in ("ground_truth", "true_label")), None)
        pred_col = next((c for c in df.columns if c.lower() in ("prediction", "predicted_label")), None)
        if true_col is not None and true_label is not None:
            df = df[df[true_col].astype(str) == true_label]
        if pred_col is not None and predicted_label is not None:
            df = df[df[pred_col].astype(str) == predicted_label]

    # 4. Sorting (before pagination; numeric columns sort numerically)
    if sort_column and sort_column in df.columns:
        ascending = sort_direction != "desc"
        df = df.sort_values(by=sort_column, ascending=ascending)

    # 5. Total BEFORE pagination
    total = len(df)

    # 6. Pagination
    page = df.iloc[offset : offset + limit]
    columns = [str(c) for c in df.columns]

    # Convert to records, handling non-serializable types
    rows = page.to_dict(orient="records")
    for row in rows:
        for k, v in list(row.items()):
            if isinstance(v, float) and pd.isna(v):
                row[k] = None
            elif hasattr(v, "isoformat"):  # datetime-like
                row[k] = v.isoformat()

    return {
        "columns": columns,
        "rows": rows,
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.get("/metrics")
def get_metrics(
    run_id: int,
    run_repo: RunRepository = Depends(get_run_repo),
):
    """Read metrics.json from the run's output directory."""
    run = run_repo.get_by_id(run_id)
    if not run or not run.output_directory:
        raise HTTPException(status_code=404, detail="Run not found or missing output directory")

    path = os.path.join(run.output_directory, "metrics.json")
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="metrics.json not found")

    try:
        with open(path, "r") as f:
            data = json.load(f)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read metrics.json: {exc}")

    return data


@router.get("/artifacts")
def get_artifacts(
    run_id: int,
    run_repo: RunRepository = Depends(get_run_repo),
):
    """Read artifacts.json from the run's output directory.

    Enriches each entry with an ``available`` boolean indicating
    whether the referenced file exists on disk.
    """
    run = run_repo.get_by_id(run_id)
    if not run or not run.output_directory:
        raise HTTPException(status_code=404, detail="Run not found or missing output directory")

    path = os.path.join(run.output_directory, "artifacts.json")
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="artifacts.json not found")

    try:
        with open(path, "r") as f:
            data = json.load(f)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read artifacts.json: {exc}")

    # Enrich with availability check
    if isinstance(data, list):
        for entry in data:
            artifact_path = entry.get("path", "")
            if artifact_path:
                entry["available"] = os.path.isfile(artifact_path)
            else:
                entry["available"] = False
    elif isinstance(data, dict):
        # Some SDK versions may return a dict keyed by artifact name
        for key, entry in data.items():
            artifact_path = entry.get("path", "") if isinstance(entry, dict) else ""
            if artifact_path:
                entry["available"] = os.path.isfile(artifact_path)
            else:
                entry["available"] = False

    return data