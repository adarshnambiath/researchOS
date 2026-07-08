from abc import ABC, abstractmethod

from app.waveform.models import WaveformListItem, WaveformRecord


class WaveformProvider(ABC):
    """Abstract interface for waveform data providers.

    Each storage format (CSV, WFDB, EDF, …) implements its own
    provider.  The API and frontend never know which provider
    served the data — they only see WaveformRecord.
    """

    @abstractmethod
    def list_waveforms(self, dataset_id: int) -> list[WaveformListItem]:
        """Return available waveform definitions for a dataset."""
        ...

    @abstractmethod
    def get_preview(self, dataset_id: int, waveform_name: str) -> WaveformRecord | None:
        """Return the first record of the named waveform."""
        ...

    @abstractmethod
    def get_record(
        self,
        dataset_id: int,
        waveform_name: str,
        record_id: str,
        start_sample: int = 0,
        num_samples: int | None = None,
    ) -> WaveformRecord | None:
        """Return a specific record identified by record_id.

        Supports windowing via start_sample and num_samples to avoid
        transferring entire long recordings to the browser.
        """
        ...
