from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories.experiment_repository import ExperimentRepository
from app.repositories.output_repository import OutputRepository
from app.repositories.run_repository import RunRepository
from app.schemas.run import RunCreate, RunDetail, RunUpdate
from app.services.run_service import RunService

# Global runs router (kept for internal use if needed)
router = APIRouter(prefix="/api/runs", tags=["runs"])

# Nested runs router – the primary API for run access
nested_router = APIRouter(prefix="/api/experiments/{experiment_id}/runs", tags=["runs-nested"])


def get_service(db: Session = Depends(get_db)) -> RunService:
    return RunService(
        RunRepository(db),
        ExperimentRepository(db),
        OutputRepository(db),
    )


# ── Global routes ───────────────────────────────────────────

@router.get("", response_model=list[dict])
def list_runs(
    experiment_id: int | None = None,
    service: RunService = Depends(get_service),
):
    return service.list_all(experiment_id)


@router.post("", response_model=RunDetail, status_code=201)
def create_run(payload: RunCreate, service: RunService = Depends(get_service)):
    return service.create(payload)


@router.get("/{run_id}", response_model=RunDetail)
def get_run(run_id: int, service: RunService = Depends(get_service)):
    run = service.get_detail(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.put("/{run_id}", response_model=RunDetail)
def update_run(
    run_id: int,
    payload: RunUpdate,
    service: RunService = Depends(get_service),
):
    run = service.update(run_id, payload)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.delete("/{run_id}", status_code=204)
def delete_run(run_id: int, service: RunService = Depends(get_service)):
    success = service.delete(run_id)
    if not success:
        raise HTTPException(status_code=404, detail="Run not found")
    return None


# ── Nested routes (primary) ─────────────────────────────────

@nested_router.get("", response_model=list[dict])
def list_experiment_runs(
    experiment_id: int,
    service: RunService = Depends(get_service),
):
    return service.list_all(experiment_id)


@nested_router.post("", response_model=RunDetail, status_code=201)
def create_experiment_run(
    experiment_id: int,
    payload: RunCreate,
    service: RunService = Depends(get_service),
):
    # Ensure experiment_id matches the URL
    payload.experiment_id = experiment_id
    return service.create(payload)


@nested_router.get("/{run_id}", response_model=RunDetail)
def get_experiment_run(
    experiment_id: int,
    run_id: int,
    service: RunService = Depends(get_service),
):
    run = service.get_detail(run_id)
    if not run or run.experiment_id != experiment_id:
        raise HTTPException(status_code=404, detail="Run not found")
    return run
