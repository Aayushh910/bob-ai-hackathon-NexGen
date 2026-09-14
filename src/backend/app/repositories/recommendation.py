from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.recommendation import Recommendation

class RecommendationRepository:
    def get_by_id(self, db: Session, recommendation_id: int) -> Optional[Recommendation]:
        return db.query(Recommendation).filter(Recommendation.id == recommendation_id).first()

    def list_recommendations(
        self,
        db: Session,
        asset_id: Optional[int] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[Recommendation], int]:
        query = db.query(Recommendation)
        if asset_id is not None:
            query = query.filter(Recommendation.asset_id == asset_id)
        if status:
            query = query.filter(Recommendation.status == status)
        if priority:
            query = query.filter(Recommendation.priority == priority)

        total = query.count()
        items = query.order_by(desc(Recommendation.generated_at)).offset(skip).limit(limit).all()
        return items, total

    def get_active_by_asset(self, db: Session, asset_id: int) -> List[Recommendation]:
        return (
            db.query(Recommendation)
            .filter(
                Recommendation.asset_id == asset_id,
                Recommendation.status.in_(["PENDING", "OPEN", "ACKNOWLEDGED"])
            )
            .order_by(desc(Recommendation.generated_at))
            .all()
        )

    def find_duplicate(self, db: Session, asset_id: int, recommendation_text: str) -> Optional[Recommendation]:
        return (
            db.query(Recommendation)
            .filter(
                Recommendation.asset_id == asset_id,
                Recommendation.status.in_(["PENDING", "OPEN", "ACKNOWLEDGED"]),
                Recommendation.recommendation == recommendation_text
            )
            .first()
        )

    def create(self, db: Session, recommendation: Recommendation) -> Recommendation:
        db.add(recommendation)
        db.commit()
        db.refresh(recommendation)
        return recommendation

    def update_status(self, db: Session, recommendation_id: int, new_status: str) -> Optional[Recommendation]:
        rec = self.get_by_id(db, recommendation_id)
        if rec:
            rec.status = new_status
            db.commit()
            db.refresh(rec)
        return rec

recommendation_repository = RecommendationRepository()
