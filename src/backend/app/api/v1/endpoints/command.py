"""API endpoints for Command Intelligence & Fleet Analytics (Phase 6)."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.command import (
    CommandKPIs,
    FleetRiskRankItem,
    CommandAttentionQueueItem,
    FleetTrendSummary,
    ReadinessChangeItem,
    OperationalImpactAssessment,
    SubsystemReliabilityMetrics,
    CommandOverviewResponse,
)
from app.services.command import command_service

router = APIRouter()


@router.get(
    "/overview",
    response_model=CommandOverviewResponse,
    summary="Get complete fleet command snapshot and intelligence",
)
def get_command_overview(db: Session = Depends(get_db)) -> CommandOverviewResponse:
    """Returns a unified command overview combining KPIs, attention queue,
    fleet risk ranking, trend intelligence, recent changes, and subsystem reliability."""
    return command_service.get_command_overview(db)


@router.get(
    "/kpis",
    response_model=CommandKPIs,
    summary="Get centralized command-level fleet KPIs",
)
def get_command_kpis(db: Session = Depends(get_db)) -> CommandKPIs:
    """Returns centralized command KPIs: total assets, readiness state breakdown,
    readiness index, critical risk assets, active anomalies, and maintenance urgency."""
    return command_service.get_command_kpis(db)


@router.get(
    "/ranking",
    response_model=List[FleetRiskRankItem],
    summary="Get deterministic fleet risk ranking",
)
def get_fleet_risk_ranking(db: Session = Depends(get_db)) -> List[FleetRiskRankItem]:
    """Returns all fleet assets ranked deterministically by multi-factor composite risk score."""
    return command_service.get_fleet_risk_ranking(db)


@router.get(
    "/attention-queue",
    response_model=List[CommandAttentionQueueItem],
    summary="Get prioritized command attention queue",
)
def get_command_attention_queue(
    limit: int = Query(15, ge=1, le=100, description="Max assets in attention queue"),
    db: Session = Depends(get_db),
) -> List[CommandAttentionQueueItem]:
    """Returns prioritized attention queue for commanders and operational planners."""
    return command_service.get_command_attention_queue(db, limit=limit)


@router.get(
    "/trends",
    response_model=FleetTrendSummary,
    summary="Get fleet readiness trends from historical assessments",
)
def get_readiness_trends(
    asset_id: Optional[int] = Query(None, description="Optional asset filter"),
    db: Session = Depends(get_db),
) -> FleetTrendSummary:
    """Evaluates sequential historical readiness assessments to classify trajectories
    into IMPROVING, STABLE, DETERIORATING, or INSUFFICIENT_HISTORY."""
    return command_service.get_trend_intelligence(db, asset_id=asset_id)


@router.get(
    "/changes",
    response_model=List[ReadinessChangeItem],
    summary="Get recent chronological operational changes",
)
def get_recent_changes(
    limit: int = Query(20, ge=1, le=100, description="Max changes to return"),
    db: Session = Depends(get_db),
) -> List[ReadinessChangeItem]:
    """Surfaces recent state transitions, significant score changes, new anomalies,
    and completed maintenance events from real database records."""
    return command_service.get_recent_changes(db, limit=limit)


@router.get(
    "/impact/{asset_id}",
    response_model=OperationalImpactAssessment,
    summary="Get operational impact assessment for an asset",
)
def get_operational_impact(
    asset_id: int,
    db: Session = Depends(get_db),
) -> OperationalImpactAssessment:
    """Returns operational consequences, impact level (CRITICAL, HIGH, MEDIUM, LOW),
    supporting evidence, and suggested mitigation for a specific asset."""
    try:
        return command_service.get_operational_impact(db, asset_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/subsystems",
    response_model=List[SubsystemReliabilityMetrics],
    summary="Get subsystem reliability and condition analytics",
)
def get_subsystem_analytics(db: Session = Depends(get_db)) -> List[SubsystemReliabilityMetrics]:
    """Returns subsystem analytics across Engine, Hydraulic System, Fuel Pump, and Battery
    covering active anomalies, historical failures, condition breakdown, and parts replaced."""
    return command_service.get_subsystem_analytics(db)
