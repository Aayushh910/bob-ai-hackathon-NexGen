from typing import List, Optional
from sqlalchemy.orm import Session
from app.repositories.base import BaseRepository
from app.models.anomaly import Anomaly
from app.schemas.anomaly import AnomalyCreate

class AnomalyRepository(BaseRepository[Anomaly, AnomalyCreate, AnomalyCreate]):
    def __init__(self):
        super().__init__(Anomaly)

    def get_by_asset(self, db: Session, asset_id: int, skip: int = 0, limit: int = 50) -> List[Anomaly]:
        return (
            db.query(Anomaly)
            .filter(Anomaly.asset_id == asset_id)
            .order_by(Anomaly.detected_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count_by_asset(self, db: Session, asset_id: int) -> int:
        return db.query(Anomaly).filter(Anomaly.asset_id == asset_id).count()

    def filter_anomalies(
        self,
        db: Session,
        asset_id: Optional[int] = None,
        severity: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Anomaly]:
        query = db.query(Anomaly)
        if asset_id:
            query = query.filter(Anomaly.asset_id == asset_id)
        if severity:
            query = query.filter(Anomaly.severity == severity.upper())

        return query.order_by(Anomaly.detected_at.desc()).offset(skip).limit(limit).all()

    def count_anomalies(
        self,
        db: Session,
        asset_id: Optional[int] = None,
        severity: Optional[str] = None
    ) -> int:
        query = db.query(Anomaly)
        if asset_id:
            query = query.filter(Anomaly.asset_id == asset_id)
        if severity:
            query = query.filter(Anomaly.severity == severity.upper())

        return query.count()

anomaly_repo = AnomalyRepository()
