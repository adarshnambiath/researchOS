from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import (
    datasets_router,
    experiments_router,
    investigation_router,
    outputs_router,
    runs_router,
    runs_nested_router,
    sdk_visualization_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Research OS",
    description="Experiment output indexing and investigation platform",
    version="0.1.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(datasets_router)
app.include_router(experiments_router)
app.include_router(runs_router)
app.include_router(outputs_router)
app.include_router(investigation_router)
app.include_router(runs_nested_router)
app.include_router(sdk_visualization_router)
