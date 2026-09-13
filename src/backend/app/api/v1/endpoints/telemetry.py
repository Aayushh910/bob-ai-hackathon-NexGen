from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.sensor import sensor_service
from app.schemas.sensor import (
    SensorReadingCreate,
    SensorReadingBulkCreate,
    SensorReadingResponse,
    TelemetryListResponse,
    BulkIngestionResponse
)

router = APIRouter()

@router.get(
    "",
    response_model=TelemetryListResponse,
    summary="Query global sensor telemetry readings",
    description="Retrieve paginated sensor telemetry across fleet assets with optional time-range filtering."
)
def list_telemetry(
    asset_id: Optional[int] = Query(None, description="Filter by Asset ID"),
    start_time: Optional[datetime] = Query(None, description="Start timestamp filter (ISO 8601)"),
    end_time: Optional[datetime] = Query(None, description="End timestamp filter (ISO 8601)"),
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(50, ge=1, le=500, description="Number of items to retrieve"),
    db: Session = Depends(get_db)
):
    items, total = sensor_service.list_telemetry(
        db=db, asset_id=asset_id, start_time=start_time, end_time=end_time, skip=skip, limit=limit
    )
    page = (skip // limit) + 1 if limit > 0 else 1
    return TelemetryListResponse(
        total=total,
        page=page,
        size=len(items),
        items=items
    )

@router.get(
    "/{reading_id}",
    response_model=SensorReadingResponse,
    summary="Get sensor reading by ID",
    description="Retrieve full details for a specific telemetry reading."
)
def get_reading(
    reading_id: int,
    db: Session = Depends(get_db)
):
    return sensor_service.get_reading(db, reading_id=reading_id)

@router.post(
    "",
    response_model=SensorReadingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest single sensor telemetry reading",
    description="Persist a single sensor measurement record in PostgreSQL."
)
def create_reading(
    reading_in: SensorReadingCreate,
    db: Session = Depends(get_db)
):
    return sensor_service.create_reading(db, reading_in=reading_in)

@router.post(
    "/bulk",
    response_model=BulkIngestionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Bulk ingest sensor telemetry readings",
    description="Persist a batch of sensor measurement records in PostgreSQL within a transaction."
)
def bulk_create_readings(
    bulk_in: SensorReadingBulkCreate,
    db: Session = Depends(get_db)
):
    count = sensor_service.bulk_create_readings(db, bulk_in=bulk_in)
    return BulkIngestionResponse(
        inserted=count,
        failed=0,
        message=f"Successfully ingested {count} telemetry records."
    )
