from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories.experiment_repository import ExperimentRepository
from app.repositories.output_repository import OutputRepository
from app.repositories.run_repository import RunRepository
from app.schemas.run import RunCreate, RunDetail
from app.services.run_service import RunService

router = APIRouter(prefix="/api/runs", tags=["runs"])


def get_service(db: Session = Depends(get_db)) -> RunService:
    return RunService(
        RunRepository(db),
        ExperimentRepository(db),
        OutputRepository(db),
    )


@router.get("/", response_model=list[dict])
def list_runs(
    experiment_id: int | None = None,
    service: RunService = Depends(get_service),
):
    return service.list_all(experiment_id)


@router.post("/", response_model=RunDetail, status_code=201)
def create_run(payload: RunCreate, service: RunService = Depends(get_service)):
    return service.create(payload)


@router.get("/{run_id}", response_model=RunDetail)
def get_run(run_id: int, service: RunService = Depends(get_service)):
    run = service.get_detail(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.delete("/{run_id}", status_code=204)
def delete_run(run_id: int, service: RunService = Depends(get_service)):
    success = service.delete(run_id)
    if not success:
        raise HTTPException(status_code=404, detail="Run not found")
    return None
