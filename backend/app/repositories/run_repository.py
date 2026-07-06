from sqlalchemy.orm import Session, joinedload

from app.models.run import Run
from app.repositories.base import BaseRepository


class RunRepository(BaseRepository[Run]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, Run)

    def get_by_id(self, id: int) -> Run | None:
        return (
            self.db.query(self.model)
            .options(joinedload(self.model.experiment))
            .filter(self.model.id == id)
            .first()
        )

    def list_by_experiment(self, experiment_id: int) -> list[Run]:
        return (
            self.db.query(self.model)
            .options(joinedload(self.model.experiment))
            .filter(self.model.experiment_id == experiment_id)
            .order_by(self.model.created_at.desc())
            .all()
        )

    def list_all(self) -> list[Run]:
        return (
            self.db.query(self.model)
            .options(joinedload(self.model.experiment))
            .order_by(self.model.created_at.desc())
            .all()
        )
