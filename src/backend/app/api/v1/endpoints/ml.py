from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.ml.registry import model_registry
from app.services.prediction import prediction_service
from app.repositories.asset import asset_repo
from app.schemas.ml import MLStatusResponse, RULResponse
from app.core.exceptions import ResourceNotFoundException

router = APIRouter()

@router.get(
    "/status",
    response_model=MLStatusResponse,
    summary="Get ML model registry status & observability",
    description="Returns the loaded state, versions, and readiness of all ML inference models and scalers."
)
def get_ml_status():
    status_data = model_registry.get_status_overview()
    return MLStatusResponse(**status_data)

@router.get(
    "/rul/{asset_id}",
    response_model=RULResponse,
    summary="Get Remaining Useful Life (RUL) estimation",
    description="Returns the predicted remaining operational hours for an asset based on Model B Gradient Boosting Regressor."
)
def get_asset_rul(
    asset_id: int,
    db: Session = Depends(get_db)
):
    asset = asset_repo.get(db, id=asset_id)
    if not asset:
        raise ResourceNotFoundException("Asset", asset_id)

    prediction = prediction_service.get_latest_prediction(db=db, asset_id=asset_id)
    return RULResponse(
        asset_id=asset.id,
        asset_code=asset.asset_code,
        rul_hours=prediction.rul_hours if prediction.rul_hours is not None else 0.0,
        confidence=prediction.confidence,
        telemetry_timestamp=prediction.prediction_timestamp,
        model_version=prediction.model_version
    )
