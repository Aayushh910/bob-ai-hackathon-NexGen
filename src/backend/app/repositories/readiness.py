from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from app.models.readiness import ReadinessAssessment
from app.models.asset import Asset

class ReadinessRepository:
    def get_by_id(self, db: Session, assessment_id: int) -> Optional[ReadinessAssessment]:
        return db.query(ReadinessAssessment).filter(ReadinessAssessment.id == assessment_id).first()

    def get_latest_by_asset(self, db: Session, asset_id: int) -> Optional[ReadinessAssessment]:
        return (
            db.query(ReadinessAssessment)
            .filter(ReadinessAssessment.asset_id == asset_id)
            .order_by(desc(ReadinessAssessment.created_at))
            .first()
        )

    def list_history_by_asset(
        self, db: Session, asset_id: int, skip: int = 0, limit: int = 50
    ) -> Tuple[List[ReadinessAssessment], int]:
        query = db.query(ReadinessAssessment).filter(ReadinessAssessment.asset_id == asset_id)
        total = query.count()
        items = query.order_by(desc(ReadinessAssessment.created_at)).offset(skip).limit(limit).all()
        return items, total

    def get_latest_assessment_map(self, db: Session) -> Dict[int, ReadinessAssessment]:
        """
        Retrieves the single most recent readiness assessment for every asset using a window/subquery.
        """
        subquery = (
            db.query(
                ReadinessAssessment.asset_id,
                func.max(ReadinessAssessment.id).label("max_id")
            )
            .group_by(ReadinessAssessment.asset_id)
            .subquery()
        )

        latest_records = (
            db.query(ReadinessAssessment)
            .join(subquery, ReadinessAssessment.id == subquery.c.max_id)
            .all()
        )
        return {rec.asset_id: rec for rec in latest_records}

    def save(self, db: Session, assessment: ReadinessAssessment) -> ReadinessAssessment:
        db.add(assessment)
        db.commit()
        db.refresh(assessment)
        return assessment

readiness_repository = ReadinessRepository()
