from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.services.base import BaseService
from app.repositories.prediction import prediction_repo
from app.repositories.asset import asset_repo
from app.models.prediction import Prediction
from app.schemas.prediction import PredictionCreate, PredictionRunResponse, PredictionResponse
from app.ml.features import extract_features_from_db
from app.ml.inference import run_unified_prediction
from app.core.exceptions import ResourceNotFoundException

class PredictionService(BaseService[Prediction, PredictionCreate, PredictionCreate]):
    def __init__(self):
        super().__init__(prediction_repo)
        self.repo = prediction_repo

    def list_predictions(
        self,
        db: Session,
        asset_id: int,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[Prediction], int]:
        asset = asset_repo.get(db, id=asset_id)
        if not asset:
            raise ResourceNotFoundException("Asset", asset_id)

        items = self.repo.get_by_asset(db, asset_id=asset_id, skip=skip, limit=limit)
        total = self.repo.count_by_asset(db, asset_id=asset_id)
        return items, total

    def get_latest_prediction(self, db: Session, asset_id: int) -> Prediction:
        asset = asset_repo.get(db, id=asset_id)
        if not asset:
            raise ResourceNotFoundException("Asset", asset_id)

        latest = self.repo.get_latest_by_asset(db, asset_id=asset_id)
        if not latest:
            # If no stored prediction exists yet, automatically run inference on latest telemetry
            run_result = self.run_prediction(db, asset_id=asset_id)
            latest = self.repo.get(db, id=run_result.prediction.id)
        return latest

    def run_prediction(self, db: Session, asset_id: int) -> PredictionRunResponse:
        asset = asset_repo.get(db, id=asset_id)
        if not asset:
            raise ResourceNotFoundException("Asset", asset_id)

        latest_reading, _, canonical_df = extract_features_from_db(db, asset_id=asset_id)

        # Execute live ML models
        results = run_unified_prediction(canonical_df)

        # Persist prediction in PostgreSQL
        prediction_obj = Prediction(
            asset_id=asset.id,
            prediction_type="UNIFIED_INFERENCE",
            failure_probability=results["failure_probability"],
            predicted_failure=results["predicted_failure"],
            risk_level=results["risk_level"],
            rul_hours=results["rul_hours"],
            predicted_failure_mode=results["predicted_failure_mode"],
            confidence=results["confidence"],
            model_version=results["model_version"]
        )
        db.add(prediction_obj)
        db.commit()
        db.refresh(prediction_obj)

        return PredictionRunResponse(
            asset_id=asset.id,
            asset_code=asset.asset_code,
            prediction=PredictionResponse.model_validate(prediction_obj),
            telemetry_timestamp_used=latest_reading.timestamp,
            message=f"Prediction executed successfully: Risk={results['risk_level']}, RUL={results['rul_hours']} hrs, Mode={results['predicted_failure_mode']}."
        )

prediction_service = PredictionService()
