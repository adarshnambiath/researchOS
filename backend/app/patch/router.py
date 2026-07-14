from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.patch.models import PatchSignalInfo, PatchSignalRecord
from app.patch.service import PatchService
from app.patch.provider import PatchProvider
from app.repositories.dataset_repository import DatasetRepository

router = APIRouter(prefix="/api/datasets/{dataset_id}/patch", tags=["patch"])


def get_service(db: Session = Depends(get_db)) -> PatchService:
    return PatchService(PatchProvider(DatasetRepository(db)))


@router.get("/signals", response_model=list[PatchSignalInfo])
def list_patch_signals(
    dataset_id: int,
    service: PatchService = Depends(get_service),
):
    return service.list_signals(dataset_id)


@router.get("/signals/{signal_name}/preview", response_model=PatchSignalRecord)
def preview_patch_signal(
    dataset_id: int,
    signal_name: str,
    service: PatchService = Depends(get_service),
):
    record = service.get_signal_preview(dataset_id, signal_name)
    if not record:
        raise HTTPException(status_code=404, detail="Signal not found or dataset unreadable")
    return record


@router.get("/signals/{signal_name}", response_model=PatchSignalRecord)
def get_patch_signal_window(
    dataset_id: int,
    signal_name: str,
    start: int = Query(0, ge=0, description="Global sample start index for this signal"),
    count: int = Query(500, ge=1, le=10000, description="Number of samples to return"),
    service: PatchService = Depends(get_service),
):
    record = service.get_signal_window(dataset_id, signal_name, start_index=start, num_samples=count)
    if not record:
        raise HTTPException(status_code=404, detail="Signal not found or dataset unreadable")
    return record
