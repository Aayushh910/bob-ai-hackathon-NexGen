"""API endpoints for Predictive Maintenance & Intervention Planning (Phase 5)."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.maintenance import (
    MaintenanceListResponse,
    MaintenanceRecordResponse,
    MaintenanceFleetSummary,
    MaintenanceQueueItem,
    InterventionPlan,
    MaintenanceStatusUpdatePayload,
    MaintenanceCompletePayload,
    PostMaintenanceReassessmentResult,
)
from app.services.maintenance import maintenance_service
from app.repositories.maintenance import maintenance_repository

router = APIRouter()


@router.get(
    "/statistics/fleet",
    response_model=MaintenanceFleetSummary,
    summary="Get fleet-wide maintenance summary and KPIs",
)
def get_fleet_maintenance_statistics(
    db: Session = Depends(get_db),
) -> MaintenanceFleetSummary:
    """Returns aggregated fleet maintenance KPIs: total records, overdue, upcoming,
    by priority, component breakdown, and fleet condition distribution."""
    return maintenance_service.get_fleet_summary(db)


@router.get(
    "/queue",
    response_model=list[MaintenanceQueueItem],
    summary="Get fleet-wide prioritized maintenance intervention queue",
)
def get_maintenance_queue(
    priority: Optional[str] = Query(None, description="Filter by priority (CRITICAL, HIGH, MEDIUM, LOW)"),
    skip: int = Query(0, ge=0, description="Records to skip"),
    limit: int = Query(100, ge=1, le=200, description="Max records to return"),
    db: Session = Depends(get_db),
) -> list[MaintenanceQueueItem]:
    """Returns all fleet assets ranked by intervention priority (CRITICAL -> HIGH -> MEDIUM -> LOW)
    with component targeting, RUL, due status, and key triggers."""
    return maintenance_service.get_maintenance_queue(db=db, priority=priority, skip=skip, limit=limit)


@router.get(
    "/asset/{asset_id}",
    summary="Get comprehensive maintenance assessment and history for a specific asset",
)
def get_asset_maintenance_assessment(
    asset_id: int,
    db: Session = Depends(get_db),
):
    """Returns complete maintenance due assessment, component-level telemetry insights,
    recommended intervention plan, and historical maintenance log for an asset."""
    try:
        return maintenance_service.get_asset_maintenance_detail(db, asset_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/plan/{asset_id}",
    response_model=InterventionPlan,
    summary="Generate targeted maintenance intervention plan",
)
def generate_intervention_plan(
    asset_id: int,
    db: Session = Depends(get_db),
) -> InterventionPlan:
    """Evaluates telemetry, ML predictions, and readiness to generate a specific,
    actionable intervention plan with deduplicated directives saved to DB."""
    try:
        return maintenance_service.generate_intervention_plan(db, asset_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.patch(
    "/{maintenance_id}/status",
    response_model=MaintenanceRecordResponse,
    summary="Update lifecycle status of a maintenance record",
)
def update_maintenance_status(
    maintenance_id: int,
    payload: MaintenanceStatusUpdatePayload,
    db: Session = Depends(get_db),
) -> MaintenanceRecordResponse:
    """Transitions a maintenance record lifecycle: IDENTIFIED -> PLANNED -> IN_PROGRESS -> COMPLETED."""
    try:
        record = maintenance_service.update_maintenance_status(
            db=db, record_id=maintenance_id, new_status=payload.status
        )
        return MaintenanceRecordResponse.model_validate(record)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/complete",
    response_model=PostMaintenanceReassessmentResult,
    summary="Log completed maintenance and trigger post-maintenance reassessment",
)
def complete_maintenance(
    payload: MaintenanceCompletePayload,
    db: Session = Depends(get_db),
) -> PostMaintenanceReassessmentResult:
    """Logs a completed maintenance event, updates asset operating hours, resets asset status,
    triggers fresh ML inference & mission readiness evaluation, and resolves directives."""
    try:
        res = maintenance_service.complete_maintenance_and_reassess(
            db=db,
            asset_id=payload.asset_id,
            component_type=payload.component_type,
            parts_replaced=payload.parts_replaced,
            technician=payload.technician,
            notes=payload.notes,
        )
        return PostMaintenanceReassessmentResult(
            message=res["message"],
            maintenance_record=res["maintenance_record"],
            updated_readiness=res["updated_readiness"],
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "",
    response_model=MaintenanceListResponse,
    summary="List paginated historical and active maintenance records",
)
def list_maintenance_records(
    asset_id: Optional[int] = Query(None, description="Filter by asset ID"),
    component_type: Optional[str] = Query(None, description="Filter by component type"),
    maintenance_type: Optional[str] = Query(None, description="Filter by maintenance type"),
    status: Optional[str] = Query(None, description="Filter by lifecycle status"),
    failure_occurred: Optional[bool] = Query(None, description="Filter by failure occurrence"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db),
) -> MaintenanceListResponse:
    """Returns paginated maintenance records with comprehensive filtering."""
    skip = (page - 1) * page_size
    records, total = maintenance_repository.list_records(
        db=db,
        asset_id=asset_id,
        component_type=component_type,
        maintenance_type=maintenance_type,
        status=status,
        failure_occurred=failure_occurred,
        skip=skip,
        limit=page_size,
    )
    return MaintenanceListResponse(
        total=total,
        page=page,
        size=page_size,
        items=[MaintenanceRecordResponse.model_validate(r) for r in records],
    )


@router.get(
    "/{maintenance_id}",
    response_model=MaintenanceRecordResponse,
    summary="Get single maintenance record by ID",
)
def get_maintenance_record(
    maintenance_id: int,
    db: Session = Depends(get_db),
) -> MaintenanceRecordResponse:
    """Fetch details of an individual maintenance record."""
    record = maintenance_repository.get_by_id(db, maintenance_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Maintenance record {maintenance_id} not found",
        )
    return MaintenanceRecordResponse.model_validate(record)
