from datetime import datetime

from pydantic import BaseModel


class OutputCreate(BaseModel):
    type: str
    filename: str
    file_path: str
    file_size: int = 0


class OutputList(BaseModel):
    id: int
    run_id: int
    type: str
    filename: str
    file_size: int
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class OutputDetail(BaseModel):
    id: int
    run_id: int
    type: str
    filename: str
    file_path: str
    file_size: int
    uploaded_at: datetime

    model_config = {"from_attributes": True}
