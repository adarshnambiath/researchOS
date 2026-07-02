from datetime import datetime

from pydantic import BaseModel, Field


class ExperimentCreate(BaseModel):
    dataset_id: int
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    objective: str | None = None
    task: str = Field(default="classification", max_length=100)


class ExperimentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    objective: str | None = None
    task: str | None = None


class ExperimentList(BaseModel):
    id: int
    dataset_id: int
    name: str
    task: str
    created_at: datetime
    run_count: int = 0

    model_config = {"from_attributes": True}


class ExperimentDetail(BaseModel):
    id: int
    dataset_id: int
    name: str
    description: str | None
    objective: str | None
    task: str
    created_at: datetime
    dataset_name: str = ""
    run_count: int = 0

    model_config = {"from_attributes": True}
