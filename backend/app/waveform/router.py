from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories.dataset_repository import DatasetRepository
from app.waveform.models import WaveformListItem, WaveformRecord
from app.waveform.service import WaveformService

router = APIRouter(
    prefix="/api/datasets/{dataset_id}/waveforms",
    tags=["waveforms"],
)


def get_service(db: Session = Depends(get_db)) -> WaveformService:
    return WaveformService(DatasetRepository(db))


@router.get("", response_model=list[WaveformListItem])
def list_waveforms(
    dataset_id: int,
    service: WaveformService = Depends(get_service),
):
    items = service.list_waveforms(dataset_id)
    if not items:
        raise HTTPException(status_code=404, detail="No waveform definitions found for this dataset")
    return items


@router.get("/{waveform_name}/preview", response_model=WaveformRecord)
def preview_waveform(
    dataset_id: int,
    waveform_name: str,
    service: WaveformService = Depends(get_service),
):
    record = service.get_preview(dataset_id, waveform_name)
    if not record:
        raise HTTPException(status_code=404, detail="Waveform not found or dataset unreadable")
    return record


@router.get("/{waveform_name}/record/{record_id}", response_model=WaveformRecord)
def get_waveform_record(
    dataset_id: int,
    waveform_name: str,
    record_id: str,
    start_sample: int = Query(0, ge=0),
    num_samples: int | None = Query(None, ge=1),
    service: WaveformService = Depends(get_service),
):
    record = service.get_record(
        dataset_id, waveform_name, record_id,
        start_sample=start_sample, num_samples=num_samples,
    )
    if not record:
        raise HTTPException(status_code=404, detail="Record not found or dataset unreadable")
    return record
