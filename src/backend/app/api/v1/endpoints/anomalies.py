from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.anomaly import anomaly_service
from app.schemas.anomaly import AnomalyResponse, AnomalyListResponse, AnomalyRunResponse

router = APIRouter()

@router.get(
    "",
    response_model=AnomalyListResponse,
    summary="List fleet anomalies",
    description="Query logged anomalies across all fleet assets with optional severity filtering."
)
def list_fleet_anomalies(
    asset_id: Optional[int] = Query(None, description="Filter by Asset ID"),
    severity: Optional[str] = Query(None, description="Filter by severity: LOW, MEDIUM, HIGH, CRITICAL"),
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(50, ge=1, le=500, description="Items to retrieve"),
    db: Session = Depends(get_db)
):
    items, total = anomaly_service.list_anomalies(
        db=db, asset_id=asset_id, severity=severity, skip=skip, limit=limit
    )
    page = (skip // limit) + 1 if limit > 0 else 1
    return AnomalyListResponse(
        total=total,
        page=page,
        size=len(items),
        items=items
    )

@router.get(
    "/{asset_id}",
    response_model=AnomalyListResponse,
    summary="List anomalies for a specific asset",
    description="Retrieve all logged anomalies for a single asset."
)
def list_asset_anomalies(
    asset_id: int,
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(50, ge=1, le=500, description="Items to retrieve"),
    db: Session = Depends(get_db)
):
    items, total = anomaly_service.list_asset_anomalies(db=db, asset_id=asset_id, skip=skip, limit=limit)
    page = (skip // limit) + 1 if limit > 0 else 1
    return AnomalyListResponse(
        total=total,
        page=page,
        size=len(items),
        items=items
    )

@router.post(
    "/{asset_id}/run",
    response_model=AnomalyRunResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute on-demand anomaly detection and sensor attribution",
    description="Evaluates the latest telemetry for an asset against the Random Forest anomaly model and provides sigma sensor attribution."
)
def run_anomaly_detection(
    asset_id: int,
    db: Session = Depends(get_db)
):
    return anomaly_service.run_anomaly_detection_for_asset(db=db, asset_id=asset_id)
