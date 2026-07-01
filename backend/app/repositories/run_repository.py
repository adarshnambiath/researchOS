from sqlalchemy.orm import Session

from app.models.run import Run
from app.repositories.base import BaseRepository


class RunRepository(BaseRepository[Run]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, Run)

    def list_by_experiment(self, experiment_id: int) -> list[Run]:
        return (
            self.db.query(self.model)
            .filter(self.model.experiment_id == experiment_id)
            .order_by(self.model.created_at.desc())
            .all()
        )
