from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.evaluation.pandas_engine import PandasEvaluationEngine
from app.repositories.output_repository import OutputRepository
from app.schemas.investigation import Insights, QueryFilters, QueryResult, RowDetail
from app.services.investigation_service import InvestigationService

router = APIRouter(prefix="/api/runs/{run_id}/investigation", tags=["investigation"])


def get_service(db: Session = Depends(get_db)) -> InvestigationService:
    return InvestigationService(OutputRepository(db), PandasEvaluationEngine())


@router.post("/query", response_model=QueryResult)
def query_evaluation(
    run_id: int,
    filters: QueryFilters,
    service: InvestigationService = Depends(get_service),
):
    result, error = service.query(run_id, filters)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return result


@router.post("/row/{index}", response_model=RowDetail)
def get_row_detail(
    run_id: int,
    index: int,
    service: InvestigationService = Depends(get_service),
):
    detail, error = service.get_row_detail(run_id, index)
    if error:
        raise HTTPException(status_code=400, detail=error)
    if not detail:
        raise HTTPException(status_code=404, detail="Row not found")
    return detail


@router.post("/insights", response_model=Insights)
def compute_insights(
    run_id: int,
    service: InvestigationService = Depends(get_service),
):
    insights, error = service.compute_insights(run_id)
    if error:
        raise HTTPException(status_code=400, detail=error)
    if not insights:
        raise HTTPException(status_code=404, detail="Evaluation file not found")
    return insights
