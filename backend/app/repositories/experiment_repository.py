from sqlalchemy.orm import Session

from app.models.experiment import Experiment
from app.repositories.base import BaseRepository


class ExperimentRepository(BaseRepository[Experiment]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, Experiment)

    def list_by_dataset(self, dataset_id: int) -> list[Experiment]:
        return (
            self.db.query(self.model)
            .filter(self.model.dataset_id == dataset_id)
            .order_by(self.model.created_at.desc())
            .all()
        )
