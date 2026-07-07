from app.repositories.dataset_repository import DatasetRepository
from app.waveform.csv_provider import CSVWaveformProvider
from app.waveform.models import WaveformListItem, WaveformRecord
from app.waveform.provider import WaveformProvider


class WaveformService:
    """Orchestrates waveform extraction from registered datasets.

    Delegates to the appropriate WaveformProvider based on the
    dataset's source type (currently CSV only; WFDB/EDF can be
    added by registering new providers).
    """

    def __init__(self, repo: DatasetRepository) -> None:
        self._repo = repo
        # Future: build a dispatch dict from dataset modality
        # to the correct provider.  For now CSV is the only source.
        self._csv_provider: WaveformProvider = CSVWaveformProvider(repo)

    def _get_provider(self, dataset_id: int) -> WaveformProvider | None:
        """Resolve the provider for a dataset.

        Currently returns the CSV provider unconditionally.
        Future: inspect dataset modality / source type to dispatch
        to WFDBWaveformProvider, EDFWaveformProvider, etc.
        """
        # Placeholder for modality-based dispatch:
        #   ds = self._repo.get_by_id(dataset_id)
        #   if ds and ds.modality == "wfdb":   return WFDBWaveformProvider(...)
        return self._csv_provider

    def list_waveforms(self, dataset_id: int) -> list[WaveformListItem]:
        provider = self._get_provider(dataset_id)
        if not provider:
            return []
        return provider.list_waveforms(dataset_id)

    def get_preview(self, dataset_id: int, waveform_name: str) -> WaveformRecord | None:
        provider = self._get_provider(dataset_id)
        if not provider:
            return None
        return provider.get_preview(dataset_id, waveform_name)

    def get_record(
        self, dataset_id: int, waveform_name: str, record_id: str
    ) -> WaveformRecord | None:
        provider = self._get_provider(dataset_id)
        if not provider:
            return None
        return provider.get_record(dataset_id, waveform_name, record_id)
