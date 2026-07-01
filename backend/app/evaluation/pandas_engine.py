import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

from app.evaluation.base import EvaluationEngine, Insights, QueryFilters, QueryResult


class PandasEvaluationEngine(EvaluationEngine):
    def query(self, filepath: str, filters: QueryFilters) -> QueryResult:
        df = pd.read_parquet(filepath)

        if "ground_truth" not in df.columns or "prediction" not in df.columns:
            raise ValueError("evaluation.parquet must contain 'ground_truth' and 'prediction' columns")

        mask = pd.Series([True] * len(df), index=df.index)

        if filters.preset == "correct":
            mask = mask & (df["ground_truth"] == df["prediction"])
        elif filters.preset == "incorrect":
            mask = mask & (df["ground_truth"] != df["prediction"])
        elif filters.preset in ("false_positive", "false_negative"):
            positives = set(df["ground_truth"].dropna().unique())
            if len(positives) > 0:
                positive_class = positives.pop()
                mask_pos = df["prediction"] == positive_class
                mask_neg = df["ground_truth"] == positive_class
                if filters.preset == "false_positive":
                    mask = mask & mask_pos & ~mask_neg
                else:
                    mask = mask & ~mask_pos & mask_neg

        if filters.ground_truth is not None:
            mask = mask & (df["ground_truth"] == filters.ground_truth)

        if filters.prediction is not None:
            mask = mask & (df["prediction"] == filters.prediction)

        if filters.confidence_min is not None:
            mask = mask & (df["confidence"] >= filters.confidence_min)

        if filters.confidence_max is not None:
            mask = mask & (df["confidence"] <= filters.confidence_max)

        if filters.sample_id is not None:
            sid_col = None
            for c in df.columns:
                if c.lower() in ("sample_id", "sampleid", "sample-id"):
                    sid_col = c
                    break
            if sid_col:
                mask = mask & (df[sid_col] == filters.sample_id)

        filtered = df[mask].reset_index(drop=True)
        total = len(filtered)
        start = filters.offset
        end = start + filters.limit
        rows = filtered.iloc[start:end].to_dict(orient="records")

        return QueryResult(
            rows=rows,
            total=total,
            offset=filters.offset,
            limit=filters.limit,
            columns=list(df.columns),
        )

    def compute_insights(self, filepath: str) -> Insights:
        df = pd.read_parquet(filepath)

        total = len(df)
        correct = (df["ground_truth"] == df["prediction"]).sum()
        incorrect = total - correct

        positives = set(df["ground_truth"].dropna().unique())
        fp = fn = None
        if len(positives) > 0:
            positive_class = positives.pop()
            fp = ((df["prediction"] == positive_class) & (df["ground_truth"] != positive_class)).sum()
            fn = ((df["prediction"] != positive_class) & (df["ground_truth"] == positive_class)).sum()

        pred_dist = df["prediction"].value_counts().to_dict()
        truth_dist = df["ground_truth"].value_counts().to_dict()

        confusion = (
            df.groupby(["ground_truth", "prediction"])
            .size()
            .reset_index(name="count")
            .sort_values("count", ascending=False)
            .head(10)
        )
        top_confusion = confusion.to_dict(orient="records")

        accuracy = float(correct) / total if total > 0 else None

        return Insights(
            accuracy=accuracy,
            total_rows=total,
            correct_count=int(correct),
            incorrect_count=int(incorrect),
            false_positive_count=int(fp) if fp is not None else 0,
            false_negative_count=int(fn) if fn is not None else 0,
            prediction_distribution=pred_dist,
            ground_truth_distribution=truth_dist,
            top_confusion_pairs=top_confusion,
        )

    def get_row(self, filepath: str, index: int) -> dict:
        df = pd.read_parquet(filepath)
        if index < 0 or index >= len(df):
            raise IndexError(f"Index {index} out of range for file with {len(df)} rows")
        row = df.iloc[index]
        return {str(k): (None if pd.isna(v) else v.item() if hasattr(v, "item") else str(v) if isinstance(v, (pd.Timestamp,)) else v) for k, v in row.items()}
