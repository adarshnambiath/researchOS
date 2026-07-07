from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    modality: Mapped[str] = mapped_column(String(50), nullable=False, default="tabular")
    storage_format: Mapped[str] = mapped_column(String(50), nullable=False, default="csv")
    source_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    label_column: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sample_id_column: Mapped[str | None] = mapped_column(String(255), nullable=True)
    row_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    schema_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    experiments: Mapped[list["Experiment"]] = relationship(
        "Experiment", back_populates="dataset", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Dataset(id={self.id}, name={self.name!r}, rows={self.row_count})>"
