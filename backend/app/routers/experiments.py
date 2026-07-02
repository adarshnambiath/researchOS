from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories.dataset_repository import DatasetRepository
from app.repositories.experiment_repository import ExperimentRepository
from app.repositories.run_repository import RunRepository
from app.schemas.experiment import ExperimentCreate, ExperimentDetail, ExperimentUpdate
from app.services.experiment_service import ExperimentService

router = APIRouter(prefix="/api/experiments", tags=["experiments"])


def get_service(db: Session = Depends(get_db)) -> ExperimentService:
    return ExperimentService(
        ExperimentRepository(db),
        DatasetRepository(db),
        RunRepository(db),
    )


@router.get("", response_model=list[dict])
def list_experiments(
    dataset_id: int | None = None,
    service: ExperimentService = Depends(get_service),
):
    return service.list_all(dataset_id)


@router.post("", response_model=ExperimentDetail, status_code=201)
def create_experiment(
    payload: ExperimentCreate,
    service: ExperimentService = Depends(get_service),
):
    return service.create(payload)


@router.get("/{experiment_id}", response_model=ExperimentDetail)
def get_experiment(
    experiment_id: int,
    service: ExperimentService = Depends(get_service),
):
    exp = service.get_detail(experiment_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return exp


@router.put("/{experiment_id}", response_model=ExperimentDetail)
def update_experiment(
    experiment_id: int,
    payload: ExperimentUpdate,
    service: ExperimentService = Depends(get_service),
):
    experiment = service.update(experiment_id, payload)
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return experiment


@router.delete("/{experiment_id}", status_code=204)
def delete_experiment(
    experiment_id: int,
    service: ExperimentService = Depends(get_service),
):
    success = service.delete(experiment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return None
