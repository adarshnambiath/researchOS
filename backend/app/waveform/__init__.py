# Register built-in providers so they are available at import time.
from app.waveform.csv_provider import CSVWaveformProvider
from app.waveform.registry import ProviderRegistry

ProviderRegistry.register("csv", CSVWaveformProvider)

