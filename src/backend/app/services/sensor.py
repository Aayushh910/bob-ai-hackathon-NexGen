from datetime import datetime
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.services.base import BaseService
from app.repositories.sensor import sensor_repo
from app.repositories.asset import asset_repo
from app.models.sensor import SensorReading
from app.schemas.sensor import SensorReadingCreate, SensorReadingBulkCreate
from app.core.exceptions import ResourceNotFoundException, SentinelAIException

class SensorReadingService(BaseService[SensorReading, SensorReadingCreate, SensorReadingCreate]):
    def __init__(self):
        super().__init__(sensor_repo)
        self.repo = sensor_repo

    def get_reading(self, db: Session, reading_id: int) -> SensorReading:
        reading = self.repo.get(db, id=reading_id)
        if not reading:
            raise ResourceNotFoundException("SensorReading", reading_id)
        return reading

    def create_reading(self, db: Session, reading_in: SensorReadingCreate) -> SensorReading:
        asset = asset_repo.get(db, id=reading_in.asset_id)
        if not asset:
            raise ResourceNotFoundException("Asset", reading_in.asset_id)
        return self.repo.create(db, obj_in=reading_in)

    def bulk_create_readings(self, db: Session, bulk_in: SensorReadingBulkCreate) -> int:
        if not bulk_in.readings:
            return 0

        # Verify all referenced asset IDs exist to ensure relational integrity
        asset_ids = {r.asset_id for r in bulk_in.readings}
        existing_assets = {a.id for a in db.query(asset_repo.model.id).filter(asset_repo.model.id.in_(asset_ids)).all()}
        missing = asset_ids - existing_assets
        if missing:
            raise SentinelAIException(
                message=f"Foreign key constraint violation: Assets with IDs {list(missing)} do not exist.",
                status_code=400
            )

        return self.repo.bulk_create(db, readings=bulk_in.readings)

    def get_telemetry_by_asset(
        self,
        db: Session,
        asset_id: int,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        component_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        order_desc: bool = True
    ) -> Tuple[List[SensorReading], int]:
        asset = asset_repo.get(db, id=asset_id)
        if not asset:
            raise ResourceNotFoundException("Asset", asset_id)

        items = self.repo.get_by_asset(
            db=db,
            asset_id=asset_id,
            start_time=start_time,
            end_time=end_time,
            component_id=component_id,
            skip=skip,
            limit=limit,
            order_desc=order_desc
        )
        total = self.repo.count_by_asset(
            db=db,
            asset_id=asset_id,
            start_time=start_time,
            end_time=end_time,
            component_id=component_id
        )
        return items, total

    def get_latest_telemetry(self, db: Session, asset_id: int) -> SensorReading:
        asset = asset_repo.get(db, id=asset_id)
        if not asset:
            raise ResourceNotFoundException("Asset", asset_id)

        latest = self.repo.get_latest_by_asset(db, asset_id=asset_id)
        if not latest:
            raise ResourceNotFoundException("Latest SensorReading for Asset", asset_id)
        return latest

    def list_telemetry(
        self,
        db: Session,
        asset_id: Optional[int] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[SensorReading], int]:
        items = self.repo.filter_readings(
            db=db, asset_id=asset_id, start_time=start_time, end_time=end_time, skip=skip, limit=limit
        )
        total = self.repo.count_readings(
            db=db, asset_id=asset_id, start_time=start_time, end_time=end_time
        )
        return items, total

sensor_service = SensorReadingService()
