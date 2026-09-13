import logging
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.recommendation import Recommendation
from app.models.asset import Asset
from app.repositories.recommendation import recommendation_repository
from app.schemas.readiness import RiskFactor
from app.schemas.recommendation import RecommendationResponse

logger = logging.getLogger("sentinelai.recommendations")

class RecommendationService:
    """
    Intelligent recommendation and operational action generation engine.
    Deduplicates recommendations to prevent database flooding.
    """

    def generate_recommendations_for_assessment(
        self,
        db: Session,
        asset: Asset,
        readiness_state: str,
        risk_level: str,
        risk_factors: List[RiskFactor],
        prediction_id: Optional[int] = None
    ) -> List[Recommendation]:
        """
        Synthesizes concrete, actionable operational directives based on active risk factors.
        Deduplicates against existing active recommendations.
        """
        generated: List[Recommendation] = []

        # 1. Operational status checks
        if asset.status in ["MAINTENANCE", "INACTIVE", "RETIRED"]:
            rec_text = f"Complete current {asset.status.lower()} procedures before mission consideration."
            rec = self._create_or_get_dedup(
                db=db,
                asset_id=asset.id,
                priority="CRITICAL" if asset.status == "MAINTENANCE" else "HIGH",
                recommendation=rec_text,
                reason=f"Asset operational status is currently {asset.status}.",
                prediction_id=prediction_id
            )
            if rec:
                generated.append(rec)
            return generated

        # 2. Process active risk factors
        for factor in risk_factors:
            if factor.factor_type == "FAILURE_RISK" and factor.severity in ["CRITICAL", "HIGH"]:
                prio = "CRITICAL" if factor.severity == "CRITICAL" else "HIGH"
                rec_text = f"Perform urgent pre-mission teardown and inspection: {factor.title}."
                rec = self._create_or_get_dedup(
                    db=db,
                    asset_id=asset.id,
                    priority=prio,
                    recommendation=rec_text,
                    reason=factor.explanation,
                    prediction_id=prediction_id
                )
                if rec:
                    generated.append(rec)

            elif factor.factor_type == "FAILURE_MODE" and factor.supporting_value != "No Failure":
                mode = factor.supporting_value or "Subsystem"
                prio = "CRITICAL" if risk_level in ["CRITICAL", "HIGH"] else "HIGH"
                rec_text = f"Inspect and test {mode} subsystem components for mechanical wear/stress."
                rec = self._create_or_get_dedup(
                    db=db,
                    asset_id=asset.id,
                    priority=prio,
                    recommendation=rec_text,
                    reason=f"Model C diagnosed failure pattern matching {mode}.",
                    prediction_id=prediction_id
                )
                if rec:
                    generated.append(rec)

            elif factor.factor_type == "ANOMALY":
                sensor = factor.affected_component_or_sensor or "sensor array"
                prio = "HIGH" if factor.severity in ["CRITICAL", "HIGH"] else "MEDIUM"
                rec_text = f"Calibrate and verify telemetry sensors for {sensor}; check physical linkages."
                rec = self._create_or_get_dedup(
                    db=db,
                    asset_id=asset.id,
                    priority=prio,
                    recommendation=rec_text,
                    reason=f"Anomaly detector flagged {sensor} with {factor.supporting_value}.",
                    prediction_id=prediction_id
                )
                if rec:
                    generated.append(rec)

            elif factor.factor_type == "LOW_RUL":
                prio = "CRITICAL" if factor.severity == "CRITICAL" else "HIGH"
                rec_text = "Schedule preventative overhaul before Remaining Useful Life threshold expires."
                rec = self._create_or_get_dedup(
                    db=db,
                    asset_id=asset.id,
                    priority=prio,
                    recommendation=rec_text,
                    reason=f"Remaining Useful Life is depleted to {factor.supporting_value}.",
                    prediction_id=prediction_id
                )
                if rec:
                    generated.append(rec)

            elif factor.factor_type == "MAINTENANCE_STATUS":
                rec_text = "Review recent degraded maintenance logs and verify replacement part integrity."
                rec = self._create_or_get_dedup(
                    db=db,
                    asset_id=asset.id,
                    priority="MEDIUM",
                    recommendation=rec_text,
                    reason=factor.explanation,
                    prediction_id=prediction_id
                )
                if rec:
                    generated.append(rec)

        # 3. If asset is READY and has no high risks
        if readiness_state == "READY" and not generated:
            rec_text = "Cleared for standard mission deployment. Maintain scheduled continuous telemetry monitoring."
            rec = self._create_or_get_dedup(
                db=db,
                asset_id=asset.id,
                priority="LOW",
                recommendation=rec_text,
                reason="All telemetry, RUL, and predictive failure risks are within normal operational limits.",
                prediction_id=prediction_id
            )
            if rec:
                generated.append(rec)

        return generated

    def _create_or_get_dedup(
        self,
        db: Session,
        asset_id: int,
        priority: str,
        recommendation: str,
        reason: str,
        prediction_id: Optional[int] = None
    ) -> Optional[Recommendation]:
        """
        Deduplicates: Returns existing recommendation if identical open item already exists;
        otherwise inserts a new one.
        """
        existing = recommendation_repository.find_duplicate(
            db=db, asset_id=asset_id, recommendation_text=recommendation
        )
        if existing:
            # Already active; return existing to avoid duplicate spam
            return existing

        new_rec = Recommendation(
            asset_id=asset_id,
            prediction_id=prediction_id,
            priority=priority,
            recommendation=recommendation,
            reason=reason,
            status="OPEN"
        )
        return recommendation_repository.create(db, new_rec)

    def list_recommendations(
        self,
        db: Session,
        asset_id: Optional[int] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ):
        return recommendation_repository.list_recommendations(
            db=db, asset_id=asset_id, status=status, priority=priority, skip=skip, limit=limit
        )

    def update_status(self, db: Session, recommendation_id: int, new_status: str) -> Optional[Recommendation]:
        valid_statuses = ["OPEN", "PENDING", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"]
        if new_status.upper() not in valid_statuses:
            raise ValueError(f"Invalid status '{new_status}'. Must be one of {valid_statuses}")
        return recommendation_repository.update_status(db, recommendation_id, new_status.upper())

recommendation_service = RecommendationService()
