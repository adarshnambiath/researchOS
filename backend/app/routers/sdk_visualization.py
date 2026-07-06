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
    limit: int = Query(100, ge=1, le=10_000),
    offset: int = Query(0, ge=0),
    run_repo: RunRepository = Depends(get_run_repo),
):
    """Read evaluation.parquet from the run's output directory.

    Returns paginated rows so the frontend never loads the entire
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

    total = len(df)
    page = df.iloc[offset : offset + limit]
    columns = [str(c) for c in df.columns]

    # Convert to records, handling non-serializable types
    rows = page.to_dict(orient="records")
    # Clean NaN / NaT values
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