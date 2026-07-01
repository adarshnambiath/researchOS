from sqlalchemy.orm import Session

from app.models.dataset import Dataset
from app.repositories.base import BaseRepository


class DatasetRepository(BaseRepository[Dataset]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, Dataset)
