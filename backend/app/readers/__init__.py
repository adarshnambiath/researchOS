from app.readers.dataset_reader import (
    ReaderFactory,
    TabularDatasetReader,
    WFDBDatasetReader,
)
from app.readers.patch_reader import PatchDatasetReader

# Register built-in readers so they are available at import time.
ReaderFactory.register("tabular", TabularDatasetReader)
ReaderFactory.register("ecg_wfdb", WFDBDatasetReader)
ReaderFactory.register("patch", PatchDatasetReader)
