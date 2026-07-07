from app.waveform.provider import WaveformProvider


class ProviderRegistry:
    """Maps storage format strings to WaveformProvider implementations.

    Example usage::

        ProviderRegistry.register("csv", CSVWaveformProvider)
        ProviderRegistry.register("wfdb", WFDBWaveformProvider)

        provider_cls = ProviderRegistry.get_provider("csv")
        provider = provider_cls(repo)
    """

    _providers: dict[str, type[WaveformProvider]] = {}

    @classmethod
    def register(cls, storage_format: str, provider_cls: type[WaveformProvider]) -> None:
        cls._providers[storage_format] = provider_cls

    @classmethod
    def get_provider(cls, storage_format: str) -> type[WaveformProvider] | None:
        return cls._providers.get(storage_format)

    @classmethod
    def registered_formats(cls) -> list[str]:
        return list(cls._providers.keys())
