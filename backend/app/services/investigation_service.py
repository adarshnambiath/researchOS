
# [Docs placeholder] InvestigationService joins evaluation with dataset:
# - Reads evaluation.parquet via EvaluationEngine
# - Loads parent experiment and dataset from database
# - Reads source CSV and matches by sample_id_column
# - Returns RowDetail(evaluation_row, dataset_row)

import json
import os

import pandas as pd

from app.evaluation.base import EvaluationEngine
from app.evaluation.pandas_engine import PandasEvaluationEngine
from app.repositories.output_repository import OutputRepository
from app.schemas.investigation import (
    Insights,
    QueryFilters,
    QueryResult,
    RowDetail,
)


class InvestigationService:
    def __init__(self, output_repo: OutputRepository, engine: EvaluationEngine) -> None:
        self.output_repo = output_repo
        self.engine = engine

    def _get_evaluation_path(self, run_id: int) -> str | None:
        output = self.output_repo.get_by_run_and_type(run_id, "evaluation")
        if not output or not os.path.isfile(output.file_path):
            return None
        return output.file_path

    def _get_dataset_row(self, dataset: pd.DataFrame, sample_id_col: str, sample_id: str) -> dict | None:
        if not sample_id_col or sample_id is None:
            return None
        mask = dataset[sample_id_col] == sample_id
        rows = dataset[mask]
        if len(rows) == 0:
            return None
        return rows.iloc[0].to_dict()

    def query(self, run_id: int, filters: QueryFilters) -> tuple[QueryResult, str | None]:
        path = self._get_evaluation_path(run_id)
        if not path:
            return QueryResult(rows=[], total=0, offset=filters.offset, limit=filters.limit, columns=[]), None

        try:
            result = self.engine.query(path, filters)
            return result, None
        except Exception as e:
            return QueryResult(rows=[], total=0, offset=filters.offset, limit=filters.limit, columns=[]), str(e)

    def get_row_detail(self, run_id: int, index: int) -> tuple[RowDetail | None, str | None]:
        import os
        from app.repositories.dataset_repository import DatasetRepository
        from app.repositories.experiment_repository import ExperimentRepository
        from app.repositories.run_repository import RunRepository
        from app.schemas.dataset import DatasetDetail

        path = self._get_evaluation_path(run_id)
        if not path:
            return None, "evaluation.parquet not found for this run"

        try:
            eval_row = self.engine.get_row(path, index)
        except Exception as e:
            return None, str(e)

        dataset_row = None
        if eval_row.get("sample_id") is not None:
            db_path = Path(__file__).parent.parent.parent / "research_os.db"
            from sqlalchemy import create_engine
            from sqlalchemy.orm import sessionmaker

            engine = create_engine(f"sqlite:///{db_path}")
            SessionLocal = sessionmaker(bind=engine)
            db = SessionLocal()

            try:
                from app.models.run import Run
                from app.models.experiment import Experiment
                from app.models.dataset import Dataset

                run = db.query(Run).get(run_id)
                if run:
                    experiment = db.query(Experiment).get(run.experiment_id)
                    if experiment:
                        dataset = db.query(Dataset).get(experiment.dataset_id)
                        if dataset and os.path.isfile(dataset.source_path):
                            df = pd.read_csv(dataset.source_path)
                            if dataset.sample_id_column and dataset.sample_id_column in df.columns:
                                mask = df[dataset.sample_id_column] == eval_row.get("sample_id")
                                rows = df[mask]
                                if len(rows) > 0:
                                    dataset_row = rows.iloc[0].to_dict()
            finally:
                db.close()

        return RowDetail(evaluation_row=eval_row, dataset_row=dataset_row), None

    def compute_insights(self, run_id: int) -> tuple[Insights | None, str | None]:
        path = self._get_evaluation_path(run_id)
        if not path:
            return None, "evaluation.parquet not found for this run"

        try:
            insights = self.engine.compute_insights(path)
            return insights, None
        except Exception as e:
            return None, str(e)
