from app.models.experiment import Experiment
from app.repositories.dataset_repository import DatasetRepository
from app.repositories.experiment_repository import ExperimentRepository
from app.repositories.run_repository import RunRepository
from app.schemas.experiment import ExperimentCreate, ExperimentDetail, ExperimentUpdate


class ExperimentService:
    def __init__(
        self,
        repo: ExperimentRepository,
        dataset_repo: DatasetRepository,
        run_repo: RunRepository,
    ) -> None:
        self.repo = repo
        self.dataset_repo = dataset_repo
        self.run_repo = run_repo

    def create(self, data: ExperimentCreate) -> ExperimentDetail:
        dataset = self.dataset_repo.get_by_id(data.dataset_id)
        if not dataset:
            raise ValueError(f"Dataset with id {data.dataset_id} not found")

        db_obj = self.repo.create(
            dataset_id=data.dataset_id,
            name=data.name,
            description=data.description,
            objective=data.objective,
            task=data.task,
        )

        return ExperimentDetail(
            id=db_obj.id,
            dataset_id=db_obj.dataset_id,
            name=db_obj.name,
            description=db_obj.description,
            objective=db_obj.objective,
            task=db_obj.task,
            created_at=db_obj.created_at,
            dataset_name=dataset.name,
            run_count=0,
        )

    def get_detail(self, experiment_id: int) -> ExperimentDetail | None:
        db_obj = self.repo.get_by_id(experiment_id)
        if not db_obj:
            return None

        dataset = self.dataset_repo.get_by_id(db_obj.dataset_id)
        runs = self.run_repo.list_by_experiment(experiment_id)

        return ExperimentDetail(
            id=db_obj.id,
            dataset_id=db_obj.dataset_id,
            name=db_obj.name,
            description=db_obj.description,
            objective=db_obj.objective,
            task=db_obj.task,
            created_at=db_obj.created_at,
            dataset_name=dataset.name if dataset else "",
            run_count=len(runs),
        )

    def list_all(self, dataset_id: int | None = None) -> list[dict]:
        if dataset_id:
            experiments = self.repo.list_by_dataset(dataset_id)
        else:
            experiments = self.repo.list_all()

        result = []
        for exp in experiments:
            runs = self.run_repo.list_by_experiment(exp.id)
            result.append(
                {
                    "id": exp.id,
                    "dataset_id": exp.dataset_id,
                    "name": exp.name,
                    "task": exp.task,
                    "created_at": exp.created_at.isoformat(),
                    "run_count": len(runs),
                }
            )
        return result

    def update(self, experiment_id: int, data: ExperimentUpdate) -> ExperimentDetail | None:
        db_obj = self.repo.get_by_id(experiment_id)
        if not db_obj:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_obj, key, value)

        self.repo.db.commit()
        self.repo.db.refresh(db_obj)
        return self.get_detail(experiment_id)

    def delete(self, experiment_id: int) -> bool:
        return self.repo.delete(experiment_id)
