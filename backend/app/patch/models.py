from pydantic import BaseModel
from typing import Any


class PatchRecordInfo(BaseModel):
    total_packets: int | None = None
    total_samples: int | None = None
    packets_in_window: int | None = None


class PatchSignalInfo(BaseModel):
    signal_name: str
    units: str | None = None
    scale_factor: float | None = None
    source_field: str
    enabled: bool = True


class PatchSignalRecord(BaseModel):
    signal_info: PatchSignalInfo
    samples: list[float]
    start_index: int
    end_index: int
    record_info: PatchRecordInfo | None = None
