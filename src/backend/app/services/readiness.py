import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.asset import Asset
from app.models.readiness import ReadinessAssessment
from app.models.prediction import Prediction
from app.models.anomaly import Anomaly
from app.models.maintenance import MaintenanceRecord
from app.repositories.readiness import readiness_repository
from app.repositories.asset import asset_repo
from app.repositories.recommendation import recommendation_repository

from app.services.prediction import prediction_service
from app.services.anomaly import anomaly_service
from app.services.recommendation import recommendation_service
from app.schemas.readiness import (
    RiskFactor,
    ContributingFactor,
    ReadinessAssessmentResponse,
    FleetReadinessItem,
    FleetReadinessSummary,
    FleetReadinessListResponse,
    AttentionQueueItem
)
from app.schemas.recommendation import RecommendationResponse

# Reserved for future deep mission profile readiness assessments and operational sorties.
# Not currently called by primary frontend navigation because the current release
# calculates fleet readiness directly from canonical PostgreSQL AssetStatus records.
logger = logging.getLogger("sentinelai.readiness")

class MissionReadinessEngine:
    """
    Deterministic Decision & Mission Readiness Layer for SentinelAI.
    Combines validated ML outputs (Failure Risk, Anomaly Detection, RUL, Failure Mode)
    and operational state into an explainable operational decision.
    """

    def evaluate_readiness(
        self,
        db: Session,
        asset: Asset,
        pred: Optional[Prediction] = None,
        anom_res: Optional[Dict[str, Any]] = None,
        recent_maintenance: Optional[MaintenanceRecord] = None
    ) -> Dict[str, Any]:
        """
        Calculates readiness_state, readiness_score, risk_level, risk_factors, and contributing_factors.
        """
        fail_prob = pred.failure_probability if pred else 0.0
        risk_level = pred.risk_level if pred else "LOW"
        rul_hours = pred.rul_hours if pred and pred.rul_hours is not None else 100.0
        mode = pred.predicted_failure_mode if pred and pred.predicted_failure_mode else "No Failure"

        is_anomaly = False
        anom_score = 0.0
        attributed_sensors: List[Dict[str, Any]] = []

        if anom_res:
            is_anomaly = anom_res.get("is_anomaly", False)
            anom_score = anom_res.get("anomaly_score", 0.0)
            attributed_sensors = [
                s for s in anom_res.get("attributed_sensors", []) if s.get("is_anomaly_cause")
            ]

        # 1. Evaluate Risk Factors
        risk_factors: List[RiskFactor] = []
        now = datetime.now(timezone.utc)

        # Operational Status Check
        if asset.status != "ACTIVE":
            risk_factors.append(RiskFactor(
                factor_type="MAINTENANCE_STATUS",
                severity="CRITICAL" if asset.status == "MAINTENANCE" else "HIGH",
                title=f"Asset Operational Status: {asset.status}",
                explanation=f"Asset is currently flagged as {asset.status} in the fleet management registry.",
                source="Fleet Asset Registry",
                supporting_value=asset.status,
                timestamp=now
            ))

        # Failure Risk Check
        if fail_prob >= 0.75:
            risk_factors.append(RiskFactor(
                factor_type="FAILURE_RISK",
                severity="CRITICAL",
                title="Critical Failure Probability within 50 Hours",
                explanation=f"Model A (Logistic Regression) evaluated a {fail_prob * 100:.1f}% likelihood of severe failure.",
                source="Model A (Failure Probability)",
                supporting_value=f"{fail_prob * 100:.1f}%",
                timestamp=now
            ))
        elif fail_prob >= 0.50:
            risk_factors.append(RiskFactor(
                factor_type="FAILURE_RISK",
                severity="HIGH",
                title="High Failure Risk within 50 Hours",
                explanation=f"Model A identified elevated operational stress with {fail_prob * 100:.1f}% failure probability.",
                source="Model A (Failure Probability)",
                supporting_value=f"{fail_prob * 100:.1f}%",
                timestamp=now
            ))
        elif fail_prob >= 0.30:
            risk_factors.append(RiskFactor(
                factor_type="FAILURE_RISK",
                severity="MEDIUM",
                title="Moderate Failure Probability",
                explanation=f"Model A evaluated failure probability at {fail_prob * 100:.1f}%.",
                source="Model A (Failure Probability)",
                supporting_value=f"{fail_prob * 100:.1f}%",
                timestamp=now
            ))

        # RUL Check
        if rul_hours < 15.0:
            risk_factors.append(RiskFactor(
                factor_type="LOW_RUL",
                severity="CRITICAL",
                title="Critical Remaining Useful Life Depletion",
                explanation=f"Model B predicts only {rul_hours:.1f} operating hours remaining before threshold exhaustion.",
                source="Model B (RUL Regressor)",
                supporting_value=f"{rul_hours:.1f} hrs",
                timestamp=now
            ))
        elif rul_hours < 35.0:
            risk_factors.append(RiskFactor(
                factor_type="LOW_RUL",
                severity="HIGH",
                title="Low Remaining Useful Life",
                explanation=f"Model B predicts {rul_hours:.1f} operating hours remaining.",
                source="Model B (RUL Regressor)",
                supporting_value=f"{rul_hours:.1f} hrs",
                timestamp=now
            ))
        elif rul_hours < 50.0:
            risk_factors.append(RiskFactor(
                factor_type="LOW_RUL",
                severity="MEDIUM",
                title="Sub-Nominal Remaining Useful Life",
                explanation=f"Model B predicts {rul_hours:.1f} operating hours remaining.",
                source="Model B (RUL Regressor)",
                supporting_value=f"{rul_hours:.1f} hrs",
                timestamp=now
            ))

        # Failure Mode Check
        if mode and mode != "No Failure":
            risk_factors.append(RiskFactor(
                factor_type="FAILURE_MODE",
                severity="HIGH" if fail_prob >= 0.50 else "MEDIUM",
                title=f"Predicted Failure Pattern: {mode}",
                explanation=f"Model C diagnosed active degradation signature consistent with {mode} failure mode.",
                source="Model C (Failure Mode Classifier)",
                affected_component_or_sensor=mode,
                supporting_value=mode,
                timestamp=now
            ))

        # Anomaly & Sensor Attribution Check
        if is_anomaly or anom_score >= 0.50 or len(attributed_sensors) > 0:
            affected_names = [s.get("sensor", "unknown") for s in attributed_sensors]
            sensor_str = ", ".join(affected_names) if affected_names else "Telemetry Array"
            prio = "HIGH" if (anom_score >= 0.70 or len(attributed_sensors) >= 2) else "MEDIUM"
            deviations_str = ", ".join([f"{s.get('sensor')}: {s.get('sigma_deviation', 0):+.1f}σ" for s in attributed_sensors[:3]])

            risk_factors.append(RiskFactor(
                factor_type="ANOMALY",
                severity=prio,
                title=f"Telemetry Anomaly in {sensor_str}",
                explanation=f"Random Forest Anomaly Detector flagged sensor deviations exceeding the 1.8σ threshold ({deviations_str}).",
                source="Anomaly Detection Pipeline",
                affected_component_or_sensor=sensor_str,
                supporting_value=f"Score {anom_score:.2f} ({len(attributed_sensors)} abnormal channels)",
                timestamp=now
            ))

        # Maintenance History Check
        if recent_maintenance and ("Degraded" in (recent_maintenance.description or "") or "Poor" in (recent_maintenance.description or "")):
            risk_factors.append(RiskFactor(
                factor_type="MAINTENANCE_STATUS",
                severity="MEDIUM",
                title="Historical Degraded Component Record",
                explanation=f"Recent maintenance on {recent_maintenance.maintenance_date.strftime('%Y-%m-%d')} reported: {recent_maintenance.description}",
                source="Historical Maintenance Log",
                affected_component_or_sensor=recent_maintenance.component,
                supporting_value=recent_maintenance.component,
                timestamp=now
            ))

        # 2. Derive Readiness Score (0 to 100) & Contributing Factors
        score = 100.0
        contributions: List[ContributingFactor] = []

        # Failure probability deduction
        if fail_prob >= 0.75:
            deduct = 45.0
            score -= deduct
            contributions.append(ContributingFactor(name="Failure Probability", score_impact=-deduct, reason=f"Critical failure risk ({fail_prob * 100:.1f}%)"))
        elif fail_prob >= 0.50:
            deduct = 30.0
            score -= deduct
            contributions.append(ContributingFactor(name="Failure Probability", score_impact=-deduct, reason=f"High failure risk ({fail_prob * 100:.1f}%)"))
        elif fail_prob >= 0.30:
            deduct = 15.0
            score -= deduct
            contributions.append(ContributingFactor(name="Failure Probability", score_impact=-deduct, reason=f"Moderate failure risk ({fail_prob * 100:.1f}%)"))
        elif fail_prob >= 0.15:
            deduct = 5.0
            score -= deduct
            contributions.append(ContributingFactor(name="Failure Probability", score_impact=-deduct, reason=f"Low baseline failure risk ({fail_prob * 100:.1f}%)"))

        # Anomaly deduction
        if is_anomaly or anom_score >= 0.75:
            deduct = 20.0 + min(len(attributed_sensors) * 3.0, 10.0)
            score -= deduct
            contributions.append(ContributingFactor(name="Sensor Anomaly", score_impact=-deduct, reason=f"High anomaly score ({anom_score:.2f}) with {len(attributed_sensors)} abnormal channels"))
        elif is_anomaly and (anom_score >= 0.40 or len(attributed_sensors) > 0):
            deduct = 10.0 + min(len(attributed_sensors) * 2.5, 7.5)
            score -= deduct
            contributions.append(ContributingFactor(name="Sensor Anomaly", score_impact=-deduct, reason=f"Telemetry anomaly indications ({len(attributed_sensors)} abnormal channels)"))

        # RUL deduction
        if rul_hours < 15.0:
            deduct = 25.0
            score -= deduct
            contributions.append(ContributingFactor(name="Remaining Useful Life", score_impact=-deduct, reason=f"Critical low RUL ({rul_hours:.1f} hrs remaining)"))
        elif rul_hours < 35.0:
            deduct = 15.0
            score -= deduct
            contributions.append(ContributingFactor(name="Remaining Useful Life", score_impact=-deduct, reason=f"Depleted RUL ({rul_hours:.1f} hrs remaining)"))
        elif rul_hours < 50.0:
            deduct = 5.0
            score -= deduct
            contributions.append(ContributingFactor(name="Remaining Useful Life", score_impact=-deduct, reason=f"Sub-nominal RUL ({rul_hours:.1f} hrs remaining)"))

        # Failure mode deduction
        if mode and mode != "No Failure":
            deduct = 10.0
            score -= deduct
            contributions.append(ContributingFactor(name="Failure Mode Diagnosis", score_impact=-deduct, reason=f"Degradation signature diagnosed as {mode}"))

        # Operational status deduction
        if asset.status == "MAINTENANCE":
            deduct = 40.0
            score -= deduct
            contributions.append(ContributingFactor(name="Operational Status", score_impact=-deduct, reason="Asset currently under maintenance"))
        elif asset.status in ["INACTIVE", "RETIRED"]:
            deduct = 80.0
            score -= deduct
            contributions.append(ContributingFactor(name="Operational Status", score_impact=-deduct, reason=f"Asset status is {asset.status}"))

        # Clamp score between 0.0 and 100.0
        final_score = max(0.0, min(100.0, round(score, 1)))

        # 3. Deterministic Decision Rules for Readiness State
        # READY, CAUTION, DEGRADED, NOT_READY
        if asset.status != "ACTIVE":
            readiness_state = "NOT_READY"
            primary_reason = f"Asset operational status is {asset.status}; offline from mission roster."
        elif fail_prob >= 0.75 or rul_hours < 15.0 or (mode != "No Failure" and fail_prob >= 0.60):
            readiness_state = "NOT_READY"
            reasons = []
            if fail_prob >= 0.75:
                reasons.append(f"critical failure risk ({fail_prob * 100:.1f}%)")
            if rul_hours < 15.0:
                reasons.append(f"imminent RUL exhaustion ({rul_hours:.1f} hrs)")
            if mode != "No Failure" and fail_prob >= 0.60:
                reasons.append(f"active {mode} subsystem degradation")
            primary_reason = f"Mission readiness rejected due to {', and '.join(reasons)}."
        elif fail_prob >= 0.50 or rul_hours < 35.0 or is_anomaly or len(attributed_sensors) >= 2:
            readiness_state = "DEGRADED"
            reasons = []
            if fail_prob >= 0.50:
                reasons.append(f"elevated failure probability ({fail_prob * 100:.1f}%)")
            if rul_hours < 35.0:
                reasons.append(f"reduced RUL ({rul_hours:.1f} hrs)")
            if is_anomaly or len(attributed_sensors) >= 2:
                reasons.append(f"active telemetry anomaly ({len(attributed_sensors)} abnormal channels)")
            primary_reason = f"Asset operational envelope degraded by {', and '.join(reasons)}."
        elif fail_prob >= 0.30 or rul_hours < 50.0 or anom_score >= 0.40 or len(attributed_sensors) == 1:
            readiness_state = "CAUTION"
            reasons = []
            if fail_prob >= 0.30:
                reasons.append(f"moderate failure risk ({fail_prob * 100:.1f}%)")
            if rul_hours < 50.0:
                reasons.append(f"sub-nominal RUL ({rul_hours:.1f} hrs)")
            if len(attributed_sensors) == 1:
                reasons.append(f"isolated {attributed_sensors[0].get('sensor')} variance")
            primary_reason = f"Cleared for constrained operation with caution: {', '.join(reasons)}."
        else:
            readiness_state = "READY"
            primary_reason = "All telemetry channels, failure probabilities, and mechanical wear indicators within nominal parameters."

        return {
            "readiness_state": readiness_state,
            "readiness_score": final_score,
            "risk_level": risk_level,
            "failure_probability": fail_prob,
            "rul_hours": rul_hours,
            "predicted_failure_mode": mode,
            "is_anomaly": is_anomaly,
            "primary_reason": primary_reason,
            "contributing_factors": [c.model_dump(mode="json") for c in contributions],
            "risk_factors": [r.model_dump(mode="json") for r in risk_factors]
        }


    def assess_asset(self, db: Session, asset_id: int) -> ReadinessAssessmentResponse:
        """
        Executes an end-to-end mission readiness assessment on an asset.
        Invokes latest telemetry & ML inference, evaluates decision rules,
        persists assessment, creates deduplicated recommendations, and returns full response.
        """
        asset = asset_repo.get(db, asset_id)
        if not asset:
            raise ValueError(f"Asset with ID {asset_id} not found.")

        # 1. Run live prediction (Models A, B, C)
        pred_run = prediction_service.run_prediction(db, asset_id)
        pred = pred_run.prediction

        # 2. Run live anomaly detection with sensor attribution
        anom_run = anomaly_service.run_anomaly_detection_for_asset(db, asset_id)
        anom_res = anom_run.model_dump()

        # 3. Retrieve most recent maintenance record if available
        recent_maint = (
            db.query(MaintenanceRecord)
            .filter(MaintenanceRecord.asset_id == asset_id)
            .order_by(desc(MaintenanceRecord.maintenance_date))
            .first()
        )

        # 4. Evaluate decision logic & score
        evaluation = self.evaluate_readiness(
            db=db,
            asset=asset,
            pred=pred,
            anom_res=anom_res,
            recent_maintenance=recent_maint
        )

        # 5. Persist assessment to readiness_assessments table
        assessment = ReadinessAssessment(
            asset_id=asset_id,
            readiness_state=evaluation["readiness_state"],
            readiness_score=evaluation["readiness_score"],
            risk_level=evaluation["risk_level"],
            failure_probability=evaluation["failure_probability"],
            rul_hours=evaluation["rul_hours"],
            predicted_failure_mode=evaluation["predicted_failure_mode"],
            is_anomaly=evaluation["is_anomaly"],
            primary_reason=evaluation["primary_reason"],
            contributing_factors=evaluation["contributing_factors"],
            risk_factors=evaluation["risk_factors"]
        )
        saved = readiness_repository.save(db, assessment)

        # 6. Generate deduplicated recommendations
        recs = recommendation_service.generate_recommendations_for_assessment(
            db=db,
            asset=asset,
            readiness_state=evaluation["readiness_state"],
            risk_level=evaluation["risk_level"],
            risk_factors=[RiskFactor(**r) for r in evaluation["risk_factors"]],
            prediction_id=pred.id if pred else None
        )

        # Build response
        return ReadinessAssessmentResponse(
            id=saved.id,
            asset_id=asset.id,
            asset_code=asset.asset_code,
            asset_type=asset.asset_type,
            model=asset.model,
            location=asset.location,
            operational_status=asset.status,
            readiness_state=saved.readiness_state,
            readiness_score=saved.readiness_score,
            risk_level=saved.risk_level,
            failure_probability=saved.failure_probability,
            rul_hours=saved.rul_hours,
            predicted_failure_mode=saved.predicted_failure_mode,
            is_anomaly=saved.is_anomaly,
            primary_reason=saved.primary_reason,
            contributing_factors=[ContributingFactor(**c) for c in saved.contributing_factors or []],
            risk_factors=[RiskFactor(**r) for r in saved.risk_factors or []],
            recommendations=[RecommendationResponse.model_validate(r) for r in recs],
            created_at=saved.created_at
        )

    def get_latest_assessment(self, db: Session, asset_id: int) -> ReadinessAssessmentResponse:
        """
        Gets latest stored assessment, or auto-assesses if none exists.
        """
        asset = asset_repo.get(db, asset_id)
        if not asset:
            raise ValueError(f"Asset with ID {asset_id} not found.")

        saved = readiness_repository.get_latest_by_asset(db, asset_id)
        if not saved:
            return self.assess_asset(db, asset_id)

        # Load active recommendations
        active_recs = recommendation_repository.get_active_by_asset(db, asset_id)

        return ReadinessAssessmentResponse(
            id=saved.id,
            asset_id=asset.id,
            asset_code=asset.asset_code,
            asset_type=asset.asset_type,
            model=asset.model,
            location=asset.location,
            operational_status=asset.status,
            readiness_state=saved.readiness_state,
            readiness_score=saved.readiness_score,
            risk_level=saved.risk_level,
            failure_probability=saved.failure_probability,
            rul_hours=saved.rul_hours,
            predicted_failure_mode=saved.predicted_failure_mode,
            is_anomaly=saved.is_anomaly,
            primary_reason=saved.primary_reason,
            contributing_factors=[ContributingFactor(**c) for c in saved.contributing_factors or []],
            risk_factors=[RiskFactor(**r) for r in saved.risk_factors or []],
            recommendations=[RecommendationResponse.model_validate(r) for r in active_recs],
            created_at=saved.created_at
        )

    def list_fleet_readiness(
        self,
        db: Session,
        state: Optional[str] = None,
        risk_level: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> FleetReadinessListResponse:
        """
        Retrieves fleet readiness using cached/stored assessments with aggregate summary KPIs.
        """
        all_assets = asset_repo.get_multi(db, skip=0, limit=1000)
        assessment_map = readiness_repository.get_latest_assessment_map(db)

        # Assets needing initial assessment
        for asset in all_assets:
            if asset.id not in assessment_map:
                try:
                    res = self.assess_asset(db, asset.id)
                    # Fetch newly created
                    saved = readiness_repository.get_by_id(db, res.id)
                    if saved:
                        assessment_map[asset.id] = saved
                except Exception as e:
                    logger.warning(f"Auto-assessment failed for asset {asset.asset_code}: {e}")

        # Summary aggregates
        ready_count = 0
        caution_count = 0
        degraded_count = 0
        not_ready_count = 0
        critical_count = 0
        anomaly_count = 0
        total_score = 0.0

        items: List[FleetReadinessItem] = []

        for asset in all_assets:
            ass = assessment_map.get(asset.id)
            if not ass:
                continue

            # Summary counters
            st = ass.readiness_state
            if st == "READY":
                ready_count += 1
            elif st == "CAUTION":
                caution_count += 1
            elif st == "DEGRADED":
                degraded_count += 1
            elif st == "NOT_READY":
                not_ready_count += 1

            if ass.risk_level == "CRITICAL":
                critical_count += 1
            if ass.is_anomaly:
                anomaly_count += 1
            total_score += ass.readiness_score

            # Filters
            if state and ass.readiness_state != state.upper():
                continue
            if risk_level and ass.risk_level != risk_level.upper():
                continue
            if search:
                term = search.lower()
                if not (
                    term in asset.asset_code.lower()
                    or term in asset.asset_type.lower()
                    or term in asset.model.lower()
                    or term in asset.location.lower()
                ):
                    continue

            open_recs = len(recommendation_repository.get_active_by_asset(db, asset.id))

            items.append(FleetReadinessItem(
                asset_id=asset.id,
                asset_code=asset.asset_code,
                asset_type=asset.asset_type,
                model=asset.model,
                location=asset.location,
                operational_status=asset.status,
                readiness_state=ass.readiness_state,
                readiness_score=ass.readiness_score,
                risk_level=ass.risk_level,
                failure_probability=ass.failure_probability,
                rul_hours=ass.rul_hours,
                is_anomaly=ass.is_anomaly,
                predicted_failure_mode=ass.predicted_failure_mode,
                primary_reason=ass.primary_reason,
                last_assessed=ass.created_at,
                open_recommendations_count=open_recs
            ))

        total_matching = len(items)
        # Sort by readiness score ascending (most critical first)
        items.sort(key=lambda x: x.readiness_score)

        paginated_items = items[skip : skip + limit]
        avg_score = round(total_score / len(all_assets), 1) if all_assets else 0.0

        summary = FleetReadinessSummary(
            total_assets=len(all_assets),
            ready_count=ready_count,
            caution_count=caution_count,
            degraded_count=degraded_count,
            not_ready_count=not_ready_count,
            critical_risk_count=critical_count,
            active_anomalies_count=anomaly_count,
            average_readiness_score=avg_score
        )

        page = (skip // limit) + 1 if limit > 0 else 1
        return FleetReadinessListResponse(
            total=total_matching,
            page=page,
            size=len(paginated_items),
            summary=summary,
            items=paginated_items
        )

    def get_attention_queue(self, db: Session, limit: int = 10) -> List[AttentionQueueItem]:
        """
        Ranks assets requiring immediate operational attention deterministically:
        CRITICAL Risk / NOT_READY -> DEGRADED -> HIGH Risk -> Active Anomaly -> Low RUL -> CAUTION.
        """
        all_assets = asset_repo.get_multi(db, skip=0, limit=1000)
        assessment_map = readiness_repository.get_latest_assessment_map(db)

        ranked: List[Tuple[int, Asset, ReadinessAssessment]] = []

        for asset in all_assets:
            ass = assessment_map.get(asset.id)
            if not ass:
                continue

            # Weight calculation: higher = more urgent
            weight = 0
            if ass.readiness_state == "NOT_READY":
                weight += 1000
            elif ass.readiness_state == "DEGRADED":
                weight += 500
            elif ass.readiness_state == "CAUTION":
                weight += 200

            if ass.risk_level == "CRITICAL":
                weight += 800
            elif ass.risk_level == "HIGH":
                weight += 400
            elif ass.risk_level == "MEDIUM":
                weight += 100

            if ass.is_anomaly:
                weight += 250

            if ass.rul_hours is not None and ass.rul_hours < 25.0:
                weight += 300

            # Inverse of readiness score
            weight += int(100.0 - ass.readiness_score)

            # Only queue assets that are NOT READY, DEGRADED, or have moderate+ risks
            if ass.readiness_state != "READY" or ass.risk_level in ["HIGH", "CRITICAL"] or ass.is_anomaly:
                ranked.append((weight, asset, ass))

        # Sort descending by weight
        ranked.sort(key=lambda x: x[0], reverse=True)

        queue: List[AttentionQueueItem] = []
        for idx, (_, asset, ass) in enumerate(ranked[:limit], start=1):
            recs = recommendation_repository.get_active_by_asset(db, asset.id)
            rec_action = recs[0].recommendation if recs else "Perform diagnostics and verify telemetry."

            # Determine primary trigger
            if ass.readiness_state == "NOT_READY":
                crit = f"Failure Risk: {((ass.failure_probability or 0.0) * 100):.1f}% | RUL: {ass.rul_hours or 0:.1f}h"
            elif ass.is_anomaly:
                crit = "Active Telemetry Anomaly Detected"
            elif ass.predicted_failure_mode and ass.predicted_failure_mode != "No Failure":
                crit = f"Diagnosed: {ass.predicted_failure_mode}"
            else:
                crit = f"Readiness Score: {ass.readiness_score}/100"

            queue.append(AttentionQueueItem(
                asset_id=asset.id,
                asset_code=asset.asset_code,
                asset_type=asset.asset_type,
                model=asset.model,
                location=asset.location,
                readiness_state=ass.readiness_state,
                risk_level=ass.risk_level,
                readiness_score=ass.readiness_score,
                urgency_rank=idx,
                primary_trigger=ass.primary_reason,
                critical_factor=crit,
                recommended_action=rec_action
            ))

        return queue

readiness_service = MissionReadinessEngine()
