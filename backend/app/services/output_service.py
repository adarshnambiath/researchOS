import os
from pathlib import Path

from app.repositories.output_repository import OutputRepository
from app.schemas.output import OutputCreate


RECOGNIZED_FILES = {
    "evaluation.parquet": "evaluation",
    "metrics.json": "metrics",
    "artifacts.json": "artifacts",
}


class OutputService:
    def __init__(self, output_repo: OutputRepository) -> None:
        self.output_repo = output_repo

    def scan_directory(self, run_directory: str) -> list[dict]:
        if not os.path.isdir(run_directory):
            raise FileNotFoundError(f"Run directory not found: {run_directory}")

        registered = []
        for filename in os.listdir(run_directory):
            if filename not in RECOGNIZED_FILES:
                continue

            filepath = os.path.join(run_directory, filename)
            if not os.path.isfile(filepath):
                continue

            file_size = os.path.getsize(filepath)
            output_type = RECOGNIZED_FILES[filename]

            existing = self.output_repo.get_by_run_and_type(
                int(run_directory.split("_")[-1]), output_type
            )
            if existing:
                existing.file_size = file_size
            else:
                create_data = OutputCreate(
                    type=output_type,
                    filename=filename,
                    file_path=filepath,
                    file_size=file_size,
                )
                run_id = int(run_directory.split("_")[-1])
                self.output_repo.create(
                    run_id=run_id,
                    type=create_data.type,
                    filename=create_data.filename,
                    file_path=create_data.file_path,
                    file_size=create_data.file_size,
                )
            registered.append(
                {"filename": filename, "type": output_type, "file_size": file_size}
            )

        return registered

    def list_outputs(self, run_id: int) -> list[dict]:
        outputs = self.output_repo.list_by_run(run_id)
        return [
            {
                "id": o.id,
                "type": o.type,
                "filename": o.filename,
                "file_size": o.file_size,
                "uploaded_at": o.uploaded_at.isoformat(),
            }
            for o in outputs
        ]

    def delete(self, output_id: int) -> bool:
        return self.output_repo.delete(output_id)
