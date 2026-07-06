from app.routers.datasets import router as datasets_router
from app.routers.experiments import router as experiments_router
from app.routers.runs import router as runs_router, nested_router as runs_nested_router
from app.routers.outputs import router as outputs_router
from app.routers.investigation import router as investigation_router
from app.routers.sdk_visualization import router as sdk_visualization_router

__all__ = [
    "datasets_router",
    "experiments_router",
    "runs_router",
    "runs_nested_router",
    "outputs_router",
    "investigation_router",
    "sdk_visualization_router",
]
