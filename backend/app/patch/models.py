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


class PacketBoundary(BaseModel):
    """Metadata for one NDJSON packet in the returned window."""
    seq: int
    ts_ecg: int
    ts_epoch_us: int
    sample_offset_start: int       # flat index of first sample of this packet
    sample_count: int              # samples contributed by this packet for this signal


class PatchSignalRecord(BaseModel):
    signal_info: PatchSignalInfo
    samples: list[float | None]    # scaled; None for sentinel gaps
    sampling_rate_hz: float | None = None
    start_sample: int              # global flat offset of first sample
    end_sample: int                # global flat offset after last sample
    start_packet_seq: int | None = None
    end_packet_seq: int | None = None
    start_ts_ecg: int | None = None
    end_ts_ecg: int | None = None
    start_epoch_us: int | None = None
    end_epoch_us: int | None = None
    duration_us: int | None = None
    packet_boundaries: list[PacketBoundary] = []
    continuous: bool = True
    record_info: PatchRecordInfo | None = None
    recording_start_time_us: int | None = None
    recording_end_time_us: int | None = None
    recording_duration_us: int | None = None
