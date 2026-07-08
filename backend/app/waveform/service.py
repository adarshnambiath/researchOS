from app.repositories.dataset_repository import DatasetRepository
from app.waveform.csv_provider import CSVWaveformProvider
from app.waveform.models import WaveformListItem, WaveformRecord
from app.waveform.registry import ProviderRegistry


class WaveformService:
    """Orchestrates waveform extraction from registered datasets.

    Delegates to the appropriate WaveformProvider based on the
    dataset's storage_format.  New storage formats (WFDB, EDF, …)
    are added by creating a provider class and registering it in
    ProviderRegistry — this class never needs to change.
    """

    def __init__(self, repo: DatasetRepository) -> None:
        self._repo = repo

    def _get_storage_format(self, dataset_id: int) -> str | None:
        ds = self._repo.get_by_id(dataset_id)
        if not ds:
            return None
        return ds.storage_format

    def _get_provider(self, dataset_id: int) -> object | None:
        storage_format = self._get_storage_format(dataset_id)
        if not storage_format:
            return None
        provider_cls = ProviderRegistry.get_provider(storage_format)
        if not provider_cls:
            return None
        return provider_cls(self._repo)

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
        self, dataset_id: int, waveform_name: str, record_id: str,
        start_sample: int = 0, num_samples: int | None = None,
    ) -> WaveformRecord | None:
        provider = self._get_provider(dataset_id)
        if not provider:
            return None
        return provider.get_record(
            dataset_id, waveform_name, record_id,
            start_sample=start_sample, num_samples=num_samples,
        )

