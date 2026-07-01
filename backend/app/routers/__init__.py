from app.routers.datasets import router as datasets_router
from app.routers.experiments import router as experiments_router
from app.routers.runs import router as runs_router
from app.routers.outputs import router as outputs_router
from app.routers.investigation import router as investigation_router

__all__ = [
    "datasets_router",
    "experiments_router",
    "runs_router",
    "outputs_router",
    "investigation_router",
]
