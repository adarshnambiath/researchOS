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
    channel_names: list[str] | None = None
    channel_units: list[str] | None = None
    all_channels: list[list[float]] | None = None
    total_samples: int | None = None


class WaveformListItem(BaseModel):
    """Summary returned by GET /waveforms for each available definition."""

    name: str
    sampling_rate_hz: float | None = None
    units: str | None = None
    start_column: str
    end_column: str
