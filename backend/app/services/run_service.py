
# [Docs placeholder] RunService manages run lifecycle:
# - Creates workspace directory on run creation
# - Validates experiment ownership
# - Auto-detects outputs in workspace directory
# - Never uploads or copies files — only records paths

import json
import os
from pathlib import Path

from app.config import settings
from app.repositories.experiment_repository import ExperimentRepository
from app.repositories.output_repository import OutputRepository
from app.repositories.run_repository import RunRepository
from app.schemas.run import RunCreate, RunDetail, RunUpdate


class RunService:
    def __init__(
        self,
        repo: RunRepository,
        experiment_repo: ExperimentRepository,
        output_repo: OutputRepository,
    ) -> None:
        self.repo = repo
        self.experiment_repo = experiment_repo
        self.output_repo = output_repo

    def _experiment_task(self, db_obj) -> str:
        """Derive task from the eagerly loaded experiment relationship."""
        if db_obj.experiment is not None:
            return db_obj.experiment.task
        return "classification"

    def _experiment_name(self, db_obj) -> str:
        if db_obj.experiment is not None:
            return db_obj.experiment.name
        return ""

    def _to_detail(self, db_obj) -> RunDetail:
        return RunDetail(
            id=db_obj.id,
            experiment_id=db_obj.experiment_id,
            model_name=db_obj.model_name,
            notes=db_obj.notes,
            seed=db_obj.seed,
            git_commit=db_obj.git_commit,
            repository_url=db_obj.repository_url,
            entry_point=db_obj.entry_point,
            hyperparameters=json.loads(db_obj.hyperparameters_json) if db_obj.hyperparameters_json else None,
            framework=db_obj.framework,
            framework_version=db_obj.framework_version,
            python_version=db_obj.python_version,
            sdk_version=db_obj.sdk_version,
            execution_device=db_obj.execution_device,
            environment_metadata=json.loads(db_obj.environment_metadata) if db_obj.environment_metadata else None,
            output_directory=db_obj.output_directory,
            created_at=db_obj.created_at,
            experiment_name=self._experiment_name(db_obj),
            task=self._experiment_task(db_obj),
        )

    def create(self, data: RunCreate) -> RunDetail:
        experiment = self.experiment_repo.get_by_id(data.experiment_id)
        if not experiment:
            raise ValueError(f"Experiment with id {data.experiment_id} not found")

        db_obj = self.repo.create(
            experiment_id=data.experiment_id,
            model_name=data.model_name,
            notes=data.notes,
            seed=data.seed,
            git_commit=data.git_commit,
            repository_url=data.repository_url,
            entry_point=data.entry_point,
            hyperparameters_json=json.dumps(data.hyperparameters) if data.hyperparameters else None,
            framework=data.framework,
            framework_version=data.framework_version,
            python_version=data.python_version,
            sdk_version=data.sdk_version,
            execution_device=data.execution_device,
            environment_metadata=json.dumps(data.environment_metadata) if data.environment_metadata else None,
        )

        # Create run output directory nested under experiment
        run_dir = (
            Path(settings.workspace_root)
            / "experiments"
            / f"experiment_{db_obj.experiment_id}"
            / f"run_{db_obj.id}"
        )
        run_dir.mkdir(parents=True, exist_ok=True)

        db_obj.output_directory = str(run_dir)
        self.repo.db.commit()
        self.repo.db.refresh(db_obj)

        return self._to_detail(db_obj)

    def get_detail(self, run_id: int) -> RunDetail | None:
        db_obj = self.repo.get_by_id(run_id)
        if not db_obj:
            return None
        return self._to_detail(db_obj)

    def list_all(self, experiment_id: int | None = None) -> list[dict]:
        if experiment_id:
            runs = self.repo.list_by_experiment(experiment_id)
        else:
            runs = self.repo.list_all()

        result = []
        for run in runs:
            evaluation = self.output_repo.get_by_run_and_type(run.id, "evaluation")
            result.append(
                {
                    "id": run.id,
                    "experiment_id": run.experiment_id,
                    "model_name": run.model_name,
                    "seed": run.seed,
                    "framework": run.framework,
                    "created_at": run.created_at.isoformat(),
                    "has_evaluation": evaluation is not None,
                    "task": self._experiment_task(run),
                }
            )
        return result

    def update(self, run_id: int, data: RunUpdate) -> RunDetail | None:
        db_obj = self.repo.get_by_id(run_id)
        if not db_obj:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if key in {"hyperparameters", "environment_metadata"} and value is not None:
                value = json.dumps(value)
            setattr(db_obj, key, value)

        self.repo.db.commit()
        self.repo.db.refresh(db_obj)

        return self._to_detail(db_obj)

    def delete(self, run_id: int) -> bool:
        db_obj = self.repo.get_by_id(run_id)
        if not db_obj:
            return False

        # Remove output directory
        if db_obj.output_directory and os.path.isdir(db_obj.output_directory):
            import shutil
            shutil.rmtree(db_obj.output_directory, ignore_errors=True)

        return self.repo.delete(run_id)
