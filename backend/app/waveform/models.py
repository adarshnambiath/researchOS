from pydantic import BaseModel


class WaveformRecord(BaseModel):
    """Standardized waveform response that all providers must return.

    Frontend components depend on this shape — any new provider
    (WFDB, EDF, …) must map its data into this structure.
    """
    waveform_name: str
    record_id: str
    label: str | None = None
    sampling_rate_hz: float | None = None
    units: str | None = None
    samples: list[float]


class WaveformListItem(BaseModel):
    """Summary returned by GET /waveforms for each available definition."""
    name: str
    sampling_rate_hz: float | None = None
    units: str | None = None
    start_column: str
    end_column: str
