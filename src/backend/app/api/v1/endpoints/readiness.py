from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.readiness import readiness_service
from app.repositories.readiness import readiness_repository
from app.schemas.readiness import (
    ReadinessAssessmentResponse,
    FleetReadinessListResponse,
    FleetReadinessSummary,
    AttentionQueueItem
)

router = APIRouter()

@router.get(
    "",
    response_model=FleetReadinessListResponse,
    summary="List fleet mission readiness assessments",
    description="Query fleet-wide readiness states, scores, and summary aggregates with filtering and pagination."
)
def list_fleet_readiness(
    state: Optional[str] = Query(None, description="Filter by readiness state: READY, CAUTION, DEGRADED, NOT_READY"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level: LOW, MEDIUM, HIGH, CRITICAL"),
    search: Optional[str] = Query(None, description="Search by asset code, model, type, location"),
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(50, ge=1, le=500, description="Items to retrieve"),
    db: Session = Depends(get_db)
):
    return readiness_service.list_fleet_readiness(
        db=db, state=state, risk_level=risk_level, search=search, skip=skip, limit=limit
    )

@router.get(
    "/attention/queue",
    response_model=List[AttentionQueueItem],
    summary="Get priority operational attention queue",
    description="Returns a prioritized list of fleet assets requiring operational attention based on risk hierarchy."
)
def get_attention_queue(
    limit: int = Query(10, ge=1, le=50, description="Number of priority assets to return"),
    db: Session = Depends(get_db)
):
    return readiness_service.get_attention_queue(db=db, limit=limit)

@router.get(
    "/statistics/fleet",
    response_model=FleetReadinessSummary,
    summary="Get fleet-wide readiness statistics",
    description="Computes aggregate readiness KPI counts, critical risk numbers, and average fleet readiness score."
)
def get_fleet_statistics(db: Session = Depends(get_db)):
    res = readiness_service.list_fleet_readiness(db=db, limit=1)
    return res.summary

@router.get(
    "/{asset_id}",
    response_model=ReadinessAssessmentResponse,
    summary="Get mission readiness assessment for an asset",
    description="Retrieves the current readiness state, score (0-100), risk factors, and recommendations for an asset."
)
def get_asset_readiness(
    asset_id: int,
    db: Session = Depends(get_db)
):
    try:
        return readiness_service.get_latest_assessment(db=db, asset_id=asset_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.post(
    "/{asset_id}/assess",
    response_model=ReadinessAssessmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute on-demand mission readiness assessment",
    description="Extracts latest telemetry, executes ML models (Failure Prob, Anomaly, RUL, Failure Mode), evaluates decision rules, and persists assessment."
)
def assess_asset_readiness(
    asset_id: int,
    db: Session = Depends(get_db)
):
    try:
        return readiness_service.assess_asset(db=db, asset_id=asset_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.get(
    "/{asset_id}/history",
    summary="Get readiness assessment history for an asset",
    description="Returns chronological historical assessments tracking changes in readiness and score over time."
)
def get_asset_readiness_history(
    asset_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    items, total = readiness_repository.list_history_by_asset(db=db, asset_id=asset_id, skip=skip, limit=limit)
    page = (skip // limit) + 1 if limit > 0 else 1
    return {
        "total": total,
        "page": page,
        "size": len(items),
        "items": items
    }
