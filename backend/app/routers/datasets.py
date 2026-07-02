from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories.dataset_repository import DatasetRepository
from app.schemas.dataset import DatasetCreate, DatasetDetail, DatasetPreview, DatasetUpdate
from app.services.dataset_service import DatasetService

router = APIRouter(prefix="/api/datasets", tags=["datasets"])


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    source_path: str = Field(..., min_length=1)
    description: str | None = None
    modality: str = Field(default="tabular", max_length=50)
    label_column: str | None = None
    sample_id_column: str | None = None


def get_service(db: Session = Depends(get_db)) -> DatasetService:
    return DatasetService(DatasetRepository(db))


@router.get("", response_model=list[dict])
def list_datasets(service: DatasetService = Depends(get_service)):
    return service.list_all()


@router.post("", response_model=DatasetDetail, status_code=201)
def register_dataset(payload: RegisterRequest, service: DatasetService = Depends(get_service)):
    result = service.register(
        DatasetCreate(
            name=payload.name,
            description=payload.description,
            modality=payload.modality,
            label_column=payload.label_column,
            sample_id_column=payload.sample_id_column,
        ),
        source_path=payload.source_path,
    )
    return result


@router.get("/{dataset_id}", response_model=DatasetDetail)
def get_dataset(dataset_id: int, service: DatasetService = Depends(get_service)):
    dataset = service.get_detail(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


@router.get("/{dataset_id}/preview", response_model=DatasetPreview)
def preview_dataset(dataset_id: int, service: DatasetService = Depends(get_service)):
    preview = service.read_preview(dataset_id)
    if not preview:
        raise HTTPException(status_code=404, detail="Dataset not found or unreadable")
    return preview


@router.put("/{dataset_id}", response_model=DatasetDetail)
def update_dataset(
    dataset_id: int,
    payload: DatasetUpdate,
    service: DatasetService = Depends(get_service),
):
    dataset = service.update(dataset_id, payload)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


@router.delete("/{dataset_id}", status_code=204)
def delete_dataset(dataset_id: int, service: DatasetService = Depends(get_service)):
    success = service.delete(dataset_id)
    if not success:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return None
