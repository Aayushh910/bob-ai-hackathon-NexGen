from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from app.repositories.base import BaseRepository
from app.models.sensor import SensorReading
from app.schemas.sensor import SensorReadingCreate

class SensorReadingRepository(BaseRepository[SensorReading, SensorReadingCreate, SensorReadingCreate]):
    def __init__(self):
        super().__init__(SensorReading)

    def get_by_asset(
        self,
        db: Session,
        asset_id: int,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        component_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        order_desc: bool = True
    ) -> List[SensorReading]:
        query = db.query(SensorReading).filter(SensorReading.asset_id == asset_id)

        if start_time:
            query = query.filter(SensorReading.timestamp >= start_time)
        if end_time:
            query = query.filter(SensorReading.timestamp <= end_time)
        if component_id:
            query = query.filter(SensorReading.component_id == component_id)

        if order_desc:
            query = query.order_by(SensorReading.timestamp.desc())
        else:
            query = query.order_by(SensorReading.timestamp.asc())

        return query.offset(skip).limit(limit).all()

    def count_by_asset(
        self,
        db: Session,
        asset_id: int,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        component_id: Optional[str] = None
    ) -> int:
        query = db.query(SensorReading).filter(SensorReading.asset_id == asset_id)

        if start_time:
            query = query.filter(SensorReading.timestamp >= start_time)
        if end_time:
            query = query.filter(SensorReading.timestamp <= end_time)
        if component_id:
            query = query.filter(SensorReading.component_id == component_id)

        return query.count()

    def get_latest_by_asset(self, db: Session, asset_id: int) -> Optional[SensorReading]:
        return (
            db.query(SensorReading)
            .filter(SensorReading.asset_id == asset_id)
            .order_by(SensorReading.timestamp.desc(), SensorReading.id.desc())
            .first()
        )

    def filter_readings(
        self,
        db: Session,
        asset_id: Optional[int] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[SensorReading]:
        query = db.query(SensorReading)

        if asset_id:
            query = query.filter(SensorReading.asset_id == asset_id)
        if start_time:
            query = query.filter(SensorReading.timestamp >= start_time)
        if end_time:
            query = query.filter(SensorReading.timestamp <= end_time)

        return query.order_by(SensorReading.timestamp.desc()).offset(skip).limit(limit).all()

    def count_readings(
        self,
        db: Session,
        asset_id: Optional[int] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> int:
        query = db.query(SensorReading)

        if asset_id:
            query = query.filter(SensorReading.asset_id == asset_id)
        if start_time:
            query = query.filter(SensorReading.timestamp >= start_time)
        if end_time:
            query = query.filter(SensorReading.timestamp <= end_time)

        return query.count()

    def bulk_create(self, db: Session, readings: List[SensorReadingCreate]) -> int:
        db_objs = [SensorReading(**reading.model_dump()) for reading in readings]
        db.bulk_save_objects(db_objs)
        db.commit()
        return len(db_objs)

sensor_repo = SensorReadingRepository()
