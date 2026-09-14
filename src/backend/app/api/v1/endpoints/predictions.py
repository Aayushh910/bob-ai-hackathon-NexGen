from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.prediction import prediction_service
from app.schemas.prediction import PredictionResponse, PredictionListResponse, PredictionRunResponse

router = APIRouter()

@router.get(
    "/{asset_id}",
    response_model=PredictionListResponse,
    summary="Get historical predictions for asset",
    description="Retrieve paginated historical prediction outputs for a specific asset."
)
def list_asset_predictions(
    asset_id: int,
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(50, ge=1, le=500, description="Items to retrieve"),
    db: Session = Depends(get_db)
):
    items, total = prediction_service.list_predictions(db=db, asset_id=asset_id, skip=skip, limit=limit)
    page = (skip // limit) + 1 if limit > 0 else 1
    return PredictionListResponse(
        total=total,
        page=page,
        size=len(items),
        items=items
    )

@router.get(
    "/{asset_id}/latest",
    response_model=PredictionResponse,
    summary="Get latest prediction for asset",
    description="Retrieve the most recent prediction or automatically generate one if none exists."
)
def get_latest_prediction(
    asset_id: int,
    db: Session = Depends(get_db)
):
    return prediction_service.get_latest_prediction(db=db, asset_id=asset_id)

@router.post(
    "/{asset_id}/run",
    response_model=PredictionRunResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute on-demand ML prediction",
    description="Extracts latest telemetry from PostgreSQL, executes Models A, B, and C, persists results, and returns output."
)
def run_prediction(
    asset_id: int,
    db: Session = Depends(get_db)
):
    return prediction_service.run_prediction(db=db, asset_id=asset_id)
