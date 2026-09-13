from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.asset import asset_service
from app.services.sensor import sensor_service
from app.schemas.asset import AssetCreate, AssetUpdate, AssetResponse, AssetListResponse
from app.schemas.sensor import TelemetryListResponse, SensorReadingResponse

router = APIRouter()

@router.get(
    "",
    response_model=AssetListResponse,
    summary="List and filter fleet assets",
    description="Retrieve a paginated list of assets with optional search and filters."
)
def list_assets(
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(50, ge=1, le=500, description="Number of items to retrieve"),
    asset_type: Optional[str] = Query(None, description="Filter by asset classification"),
    status: Optional[str] = Query(None, description="Filter by status (ACTIVE, INACTIVE, MAINTENANCE, RETIRED)"),
    search: Optional[str] = Query(None, description="Search query matching code, model, or location"),
    db: Session = Depends(get_db)
):
    items, total = asset_service.list_assets(
        db=db, skip=skip, limit=limit, asset_type=asset_type, status=status, search=search
    )
    page = (skip // limit) + 1 if limit > 0 else 1
    return AssetListResponse(
        total=total,
        page=page,
        size=len(items),
        items=items
    )

@router.get(
    "/{asset_id}",
    response_model=AssetResponse,
    summary="Get asset details by ID",
    description="Retrieve full details for a specific asset by primary ID."
)
def get_asset(
    asset_id: int,
    db: Session = Depends(get_db)
):
    return asset_service.get_asset(db, asset_id=asset_id)

@router.post(
    "",
    response_model=AssetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new fleet asset",
    description="Register a new asset in the SentinelAI fleet registry."
)
def create_asset(
    asset_in: AssetCreate,
    db: Session = Depends(get_db)
):
    return asset_service.create_asset(db, asset_in=asset_in)

@router.patch(
    "/{asset_id}",
    response_model=AssetResponse,
    summary="Update asset details",
    description="Modify existing asset fields such as status, location, or classification."
)
def update_asset(
    asset_id: int,
    asset_in: AssetUpdate,
    db: Session = Depends(get_db)
):
    return asset_service.update_asset(db, asset_id=asset_id, asset_in=asset_in)

@router.delete(
    "/{asset_id}",
    status_code=status.HTTP_200_OK,
    summary="Decommission or remove an asset",
    description="Delete an asset from the fleet registry."
)
def delete_asset(
    asset_id: int,
    db: Session = Depends(get_db)
):
    asset_service.delete_asset(db, asset_id=asset_id)
    return {"message": "Asset deleted successfully", "id": asset_id}

@router.get(
    "/{asset_id}/telemetry",
    response_model=TelemetryListResponse,
    summary="Get sensor telemetry readings for an asset",
    description="Retrieve historical sensor measurements for a specific asset with optional time-range filtering."
)
def get_asset_telemetry(
    asset_id: int,
    start_time: Optional[datetime] = Query(None, description="Start timestamp filter (ISO 8601)"),
    end_time: Optional[datetime] = Query(None, description="End timestamp filter (ISO 8601)"),
    component_id: Optional[str] = Query(None, description="Filter by component ID"),
    skip: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(50, ge=1, le=500, description="Items per page"),
    order_desc: bool = Query(True, description="Order newest to oldest"),
    db: Session = Depends(get_db)
):
    items, total = sensor_service.get_telemetry_by_asset(
        db=db,
        asset_id=asset_id,
        start_time=start_time,
        end_time=end_time,
        component_id=component_id,
        skip=skip,
        limit=limit,
        order_desc=order_desc
    )
    page = (skip // limit) + 1 if limit > 0 else 1
    return TelemetryListResponse(
        total=total,
        page=page,
        size=len(items),
        items=items
    )

@router.get(
    "/{asset_id}/telemetry/latest",
    response_model=SensorReadingResponse,
    summary="Get latest telemetry reading for an asset",
    description="Retrieve the most recent HUMS sensor telemetry reading for an asset."
)
def get_latest_asset_telemetry(
    asset_id: int,
    db: Session = Depends(get_db)
):
    return sensor_service.get_latest_telemetry(db=db, asset_id=asset_id)
