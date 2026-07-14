from app.patch.provider import PatchProvider
from app.patch.models import PatchSignalInfo, PatchSignalRecord


class PatchService:
    """Orchestrates patch signal extraction.

    Delegates spout.json streaming to PatchProvider.  Keeps the router
    thin while keeping modality logic out of the provider.
    """

    def __init__(self, provider: PatchProvider) -> None:
        self._provider = provider

    def list_signals(self, dataset_id: int) -> list[PatchSignalInfo]:
        return self._provider.list_signals(dataset_id)

    def get_signal_preview(
        self, dataset_id: int, signal_name: str
    ) -> PatchSignalRecord | None:
        return self._provider.get_signal_preview(dataset_id, signal_name)

    def get_signal_window(
        self,
        dataset_id: int,
        signal_name: str,
        start_index: int = 0,
        num_samples: int = 500,
    ) -> PatchSignalRecord | None:
        return self._provider.get_signal_window(
            dataset_id, signal_name, start_index, num_samples
        )
