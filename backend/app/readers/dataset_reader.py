import abc
from typing import Any

import pandas as pd


class DatasetReader(abc.ABC):
    @abc.abstractmethod
    def read_preview(self, path: str, limit: int = 20) -> tuple[list[str], list[dict[str, Any]]]:
        raise NotImplementedError


class PandasDatasetReader(DatasetReader):
    def read_preview(self, path: str, limit: int = 20) -> tuple[list[str], list[dict[str, Any]]]:
        df = pd.read_csv(path, nrows=limit)
        columns = [str(c) for c in df.columns]
        rows = df.to_dict(orient="records")
        return columns, rows
