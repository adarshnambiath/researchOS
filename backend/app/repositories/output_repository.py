from sqlalchemy.orm import Session

from app.models.output import Output
from app.repositories.base import BaseRepository


class OutputRepository(BaseRepository[Output]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, Output)

    def list_by_run(self, run_id: int) -> list[Output]:
        return (
            self.db.query(self.model)
            .filter(self.model.run_id == run_id)
            .order_by(self.model.uploaded_at.desc())
            .all()
        )

    def get_by_run_and_type(self, run_id: int, type: str) -> Output | None:
        return (
            self.db.query(self.model)
            .filter(self.model.run_id == run_id, self.model.type == type)
            .first()
        )
