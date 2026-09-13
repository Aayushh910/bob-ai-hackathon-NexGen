from typing import List, Optional
from sqlalchemy.orm import Session
from app.repositories.base import BaseRepository
from app.models.prediction import Prediction
from app.schemas.prediction import PredictionCreate

class PredictionRepository(BaseRepository[Prediction, PredictionCreate, PredictionCreate]):
    def __init__(self):
        super().__init__(Prediction)

    def get_by_asset(self, db: Session, asset_id: int, skip: int = 0, limit: int = 50) -> List[Prediction]:
        return (
            db.query(Prediction)
            .filter(Prediction.asset_id == asset_id)
            .order_by(Prediction.prediction_timestamp.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count_by_asset(self, db: Session, asset_id: int) -> int:
        return db.query(Prediction).filter(Prediction.asset_id == asset_id).count()

    def get_latest_by_asset(self, db: Session, asset_id: int) -> Optional[Prediction]:
        return (
            db.query(Prediction)
            .filter(Prediction.asset_id == asset_id)
            .order_by(Prediction.prediction_timestamp.desc())
            .first()
        )

prediction_repo = PredictionRepository()
