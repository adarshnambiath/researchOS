from datetime import datetime

from pydantic import BaseModel, Field


class RunCreate(BaseModel):
    experiment_id: int
    model_name: str = Field(..., min_length=1, max_length=255)
    notes: str | None = None
    seed: int | None = None
    git_commit: str | None = None
    repository_url: str | None = None
    entry_point: str | None = None
    hyperparameters: dict[str, str] | None = None
    framework: str | None = None
    framework_version: str | None = None
    python_version: str | None = None
    sdk_version: str | None = None
    execution_device: str | None = None
    environment_metadata: dict[str, str] | None = None


class RunUpdate(BaseModel):
    model_name: str | None = None
    notes: str | None = None
    seed: int | None = None
    git_commit: str | None = None
    repository_url: str | None = None
    entry_point: str | None = None
    hyperparameters: dict[str, str] | None = None
    framework: str | None = None
    framework_version: str | None = None
    python_version: str | None = None
    sdk_version: str | None = None
    execution_device: str | None = None
    environment_metadata: dict[str, str] | None = None


class RunList(BaseModel):
    id: int
    experiment_id: int
    model_name: str
    seed: int | None
    framework: str | None
    created_at: datetime
    has_evaluation: bool = False
    task: str = "classification"

    model_config = {"from_attributes": True}


class RunDetail(BaseModel):
    id: int
    experiment_id: int
    model_name: str
    notes: str | None
    seed: int | None
    git_commit: str | None
    repository_url: str | None
    entry_point: str | None
    hyperparameters: dict[str, str] | None
    framework: str | None
    framework_version: str | None
    python_version: str | None
    sdk_version: str | None
    execution_device: str | None
    environment_metadata: dict[str, str] | None
    output_directory: str | None
    created_at: datetime
    experiment_name: str = ""
    task: str = "classification"

    model_config = {"from_attributes": True}
