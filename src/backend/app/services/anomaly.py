from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.services.base import BaseService
from app.repositories.anomaly import anomaly_repo
from app.repositories.asset import asset_repo
from app.models.anomaly import Anomaly
from app.schemas.anomaly import AnomalyCreate, AnomalyRunResponse, SensorAttribution
from app.ml.features import extract_features_from_db
from app.ml.inference import run_anomaly_detection
from app.core.exceptions import ResourceNotFoundException

class AnomalyService(BaseService[Anomaly, AnomalyCreate, AnomalyCreate]):
    def __init__(self):
        super().__init__(anomaly_repo)
        self.repo = anomaly_repo

    def list_anomalies(
        self,
        db: Session,
        asset_id: Optional[int] = None,
        severity: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[Anomaly], int]:
        items = self.repo.filter_anomalies(db, asset_id=asset_id, severity=severity, skip=skip, limit=limit)
        total = self.repo.count_anomalies(db, asset_id=asset_id, severity=severity)
        return items, total

    def list_asset_anomalies(
        self,
        db: Session,
        asset_id: int,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[Anomaly], int]:
        asset = asset_repo.get(db, id=asset_id)
        if not asset:
            raise ResourceNotFoundException("Asset", asset_id)

        items = self.repo.get_by_asset(db, asset_id=asset_id, skip=skip, limit=limit)
        total = self.repo.count_by_asset(db, asset_id=asset_id)
        return items, total

    def run_anomaly_detection_for_asset(self, db: Session, asset_id: int) -> AnomalyRunResponse:
        asset = asset_repo.get(db, id=asset_id)
        if not asset:
            raise ResourceNotFoundException("Asset", asset_id)

        latest_reading, anomaly_dict, _ = extract_features_from_db(db, asset_id=asset_id)

        # Run model inference and attribution
        results = run_anomaly_detection(anomaly_dict)

        persisted_id = None
        # If anomalous, persist record in PostgreSQL
        if results["is_anomaly"]:
            anomaly_obj = Anomaly(
                asset_id=asset.id,
                sensor_reading_id=latest_reading.id,
                anomaly_score=results["anomaly_score"],
                severity=results["severity"],
                affected_sensor=str(results["affected_sensor"] or "")[:250],
                explanation=results["explanation"],

                model_version=results["model_version"]
            )
            db.add(anomaly_obj)
            db.commit()
            db.refresh(anomaly_obj)
            persisted_id = anomaly_obj.id

        attributions = [SensorAttribution(**a) for a in results["attributed_sensors"]]

        return AnomalyRunResponse(
            asset_id=asset.id,
            asset_code=asset.asset_code,
            is_anomaly=results["is_anomaly"],
            anomaly_score=results["anomaly_score"],
            threshold=results["threshold"],
            severity=results["severity"],
            telemetry_timestamp_used=latest_reading.timestamp,
            attributed_sensors=attributions,
            persisted_anomaly_id=persisted_id,
            message=results["explanation"]
        )

anomaly_service = AnomalyService()
