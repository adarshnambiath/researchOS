import abc
import os
from typing import Any, Tuple

import pandas as pd

from app.schemas.dataset import (
    ColumnMetadata,
    DatasetMetadata,
    PlatformType,
    WFDBDatasetMetadata,
    WFDBRecordMetadata,
)


class DatasetReader(abc.ABC):
    @abc.abstractmethod
    def read_preview(self, path: str, limit: int = 20) -> tuple[list[str], list[dict[str, Any]]]:
        raise NotImplementedError


class TabularDatasetReader(DatasetReader):
    def register(self, path: str) -> Tuple[int, DatasetMetadata]:
        df = pd.read_csv(path)
        row_count = int(len(df))
        metadata = self._infer_metadata(df)
        return row_count, metadata

    def read_preview(self, path: str, limit: int = 20) -> Tuple[list[str], list[dict[str, Any]]]:
        df = pd.read_csv(path, nrows=limit)
        columns = [str(c) for c in df.columns]
        rows = df.to_dict(orient="records")
        return columns, rows

    def _infer_metadata(self, df: pd.DataFrame) -> DatasetMetadata:
        columns: list[ColumnMetadata] = []
        for col_name in df.columns:
            series = df[col_name]
            inferred_type, nullable = self._infer_column_type(series)

            col_meta = ColumnMetadata(
                name=str(col_name),
                type=inferred_type,
                nullable=bool(nullable),
                missing_count=int(series.isna().sum()),
                unique_count=int(series.nunique(dropna=True)),
            )

            if inferred_type == PlatformType.INTEGER:
                col_meta.minimum = int(series.min()) if pd.Series(series.dropna()).notna().any() else None
                col_meta.maximum = int(series.max()) if pd.Series(series.dropna()).notna().any() else None
            elif inferred_type == PlatformType.FLOAT:
                col_meta.minimum = float(series.min()) if pd.Series(series.dropna()).notna().any() else None
                col_meta.maximum = float(series.max()) if pd.Series(series.dropna()).notna().any() else None
                col_meta.mean = float(series.mean()) if pd.Series(series.dropna()).notna().any() else None
            elif inferred_type == PlatformType.CATEGORICAL:
                categories = series.dropna().unique().tolist()
                col_meta.categories = [str(c) for c in categories]

            columns.append(col_meta)

        return DatasetMetadata(columns=columns, row_count=int(len(df)))

    def _infer_column_type(self, series: pd.Series) -> Tuple[PlatformType, bool]:
        nullable = bool(series.isna().any())
        non_null = series.dropna()

        if len(non_null) == 0:
            return PlatformType.UNKNOWN, nullable

        if pd.api.types.is_bool_dtype(series):
            return PlatformType.BOOLEAN, nullable

        if pd.api.types.is_integer_dtype(series):
            return PlatformType.INTEGER, nullable

        if pd.api.types.is_float_dtype(series):
            return PlatformType.FLOAT, nullable

        if pd.api.types.is_datetime64_any_dtype(series):
            if pd.api.types.is_datetime64_ns_dtype(series):
                return PlatformType.DATETIME, nullable
            return PlatformType.DATE, nullable

        if pd.api.types.is_timedelta64_dtype(series):
            return PlatformType.TIME, nullable

        if pd.api.types.is_categorical_dtype(series) or pd.api.types.is_string_dtype(series):
            unique_count = non_null.nunique()
            if unique_count <= 20:
                return PlatformType.CATEGORICAL, nullable
            return PlatformType.STRING, nullable

        sample = non_null.head(20)
        if self._try_numeric(sample):
            return PlatformType.FLOAT, nullable
        if self._try_booleans(sample):
            return PlatformType.BOOLEAN, nullable
        if self._try_datetimes(sample):
            return PlatformType.DATETIME, nullable
        if self._try_dates(sample):
            return PlatformType.DATE, nullable
        if self._try_times(sample):
            return PlatformType.TIME, nullable
        if self._try_categorical(sample):
            return PlatformType.CATEGORICAL, nullable

        return PlatformType.STRING, nullable

    def _try_numeric(self, series: pd.Series) -> bool:
        try:
            cleaned = (
                series.astype(str)
                .str.replace(r"[^0-9eE+\-.]", "", regex=True)
                .replace("", None)
            )
            pd.to_numeric(cleaned)
            return True
        except Exception:
            return False

    def _try_booleans(self, series: pd.Series) -> bool:
        normalized = series.astype(str).str.strip().str.lower()
        return normalized.isin({"true", "false", "1", "0", "yes", "no"}).all()

    def _try_datetimes(self, series: pd.Series) -> bool:
        try:
            pd.to_datetime(series)
            return True
        except Exception:
            return False

    def _try_dates(self, series: pd.Series) -> bool:
        try:
            pd.to_datetime(series).dt.date
            return True
        except Exception:
            return False

    def _try_times(self, series: pd.Series) -> bool:
        try:
            pd.to_datetime(series).dt.time
            return True
        except Exception:
            return False

    def _try_categorical(self, series: pd.Series) -> bool:
        return series.nunique() <= 20


class WFDBDatasetReader(DatasetReader):
    def register(self, path: str) -> Tuple[int, DatasetMetadata]:
        if not os.path.isdir(path):
            raise FileNotFoundError(f"WFDB directory not found: {path}")

        entries = sorted(os.listdir(path))
        hea_files = [f for f in entries if f.endswith(".hea")]
        if not hea_files:
            raise ValueError("No valid WFDB records found (.hea files missing)")

        records: list[WFDBRecordMetadata] = []
        try:
            import wfdb
        except ModuleNotFoundError as exc:
            raise RuntimeError(
                "The 'wfdb' package is required to register ECG (WFDB) datasets. "
                "Install it with: pip install wfdb>=4.0.0"
            ) from exc

        for hea_file in hea_files:
            record_name = hea_file[:-4]
            hea_path = os.path.join(path, hea_file)
            dat_path = os.path.join(path, f"{record_name}.dat")
            if not os.path.isfile(dat_path):
                raise ValueError(f"Missing .dat file for record {record_name}")

            try:
                rec = wfdb.rdheader(hea_path[:-4] if hea_path.endswith(".hea") else hea_path)
            except Exception as exc:
                raise ValueError(f"Invalid WFDB header: {hea_path}") from exc

            records.append(
                WFDBRecordMetadata(
                    record_name=record_name,
                    sampling_rate=float(rec.fs) if rec.fs is not None else None,
                    channel_names=(
                        list(rec.sig_name)
                        if hasattr(rec, "sig_name") and rec.sig_name is not None
                        else None
                    ),
                    signal_units=(
                        list(rec.units)
                        if hasattr(rec, "units") and rec.units is not None
                        else None
                    ),
                    number_of_channels=int(rec.n_sig) if hasattr(rec, "n_sig") and rec.n_sig is not None else None,
                )
            )

        def _all_same(values: list[Any]) -> Any:
            if not values:
                return None
            first = values[0]
            if all(v == first for v in values):
                return first
            return None

        sampling_rates = [r.sampling_rate for r in records if r.sampling_rate is not None]
        channel_names_list = [r.channel_names for r in records if r.channel_names is not None]
        signal_units_list = [r.signal_units for r in records if r.signal_units is not None]
        n_channels_list = [r.number_of_channels for r in records if r.number_of_channels is not None]

        channel_names_tuple = (
            tuple(channel_names_list[0])
            if len(channel_names_list) > 0
            and len(set(tuple(c) for c in channel_names_list)) == 1
            else None
        )
        signal_units_tuple = (
            tuple(signal_units_list[0])
            if len(signal_units_list) > 0
            and len(set(tuple(u) for u in signal_units_list)) == 1
            else None
        )

        wfdb_meta = WFDBDatasetMetadata(
            number_of_records=len(records),
            records=records,
            sampling_rate=_all_same(sampling_rates),
            channel_names=list(channel_names_tuple) if channel_names_tuple is not None else None,
            signal_units=list(signal_units_tuple) if signal_units_tuple is not None else None,
            number_of_channels=_all_same(n_channels_list),
        )

        metadata = DatasetMetadata(columns=[], row_count=len(records), wfdb=wfdb_meta)
        return len(records), metadata

    def read_preview(self, path: str, limit: int = 20) -> Tuple[list[str], list[dict[str, Any]]]:
        return [], []
