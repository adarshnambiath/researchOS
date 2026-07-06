from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories.output_repository import OutputRepository
from app.repositories.run_repository import RunRepository
from app.schemas.output import OutputList
from app.services.output_service import OutputService

router = APIRouter(prefix="/api/runs/{run_id}/outputs", tags=["outputs"])


def get_service(db: Session = Depends(get_db)) -> OutputService:
    return OutputService(OutputRepository(db))


def get_run_repo(db: Session = Depends(get_db)) -> RunRepository:
    return RunRepository(db)


@router.get("", response_model=list[dict])
def list_outputs(
    run_id: int,
    service: OutputService = Depends(get_service),
    run_repo: RunRepository = Depends(get_run_repo),
):
    """Return filesystem-detected outputs for this run.

    Inspects Run.output_directory and reports which of the three
    recognized files (evaluation.parquet, metrics.json, artifacts.json)
    exist on disk.  Does NOT consult the database.
    """
    run = run_repo.get_by_id(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return service.detect_outputs(run.output_directory or "")


@router.post("/sync", response_model=list[dict], status_code=201)
def sync_outputs(
    run_id: int,
    service: OutputService = Depends(get_service),
    run_repo: RunRepository = Depends(get_run_repo),
):
    run = run_repo.get_by_id(run_id)
    if not run or not run.output_directory:
        raise HTTPException(status_code=404, detail="Run not found or missing output directory")
    return service.scan_directory(run.output_directory)
