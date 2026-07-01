from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Run(Base):
    __tablename__ = "runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    experiment_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("experiments.id", ondelete="CASCADE"), nullable=False
    )
    model_name: Mapped[str] = mapped_column(String(255), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    seed: Mapped[int | None] = mapped_column(Integer, nullable=True)
    git_commit: Mapped[str | None] = mapped_column(String(255), nullable=True)
    repository_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    entry_point: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    hyperparameters_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    framework: Mapped[str | None] = mapped_column(String(100), nullable=True)
    framework_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    python_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    sdk_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    execution_device: Mapped[str | None] = mapped_column(String(50), nullable=True)
    environment_metadata: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_directory: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    experiment: Mapped["Experiment"] = relationship("Experiment", back_populates="runs")
    outputs: Mapped[list["Output"]] = relationship(
        "Output", back_populates="run", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Run(id={self.id}, model='{self.model_name}')>"
