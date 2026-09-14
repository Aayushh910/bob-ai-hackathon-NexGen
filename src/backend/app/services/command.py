"""Command Intelligence Engine for SentinelAI (Phase 6).

Synthesizes telemetry, ML models, anomaly detection, mission readiness,
predictive maintenance, and directives into a unified command intelligence layer.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.models.asset import Asset
from app.models.readiness import ReadinessAssessment
from app.models.prediction import Prediction
from app.models.anomaly import Anomaly
from app.models.maintenance import MaintenanceRecord
from app.models.recommendation import Recommendation

from app.repositories.asset import asset_repo
from app.repositories.readiness import readiness_repository
from app.repositories.maintenance import maintenance_repository
from app.repositories.recommendation import recommendation_repository

from app.services.readiness import readiness_service
from app.services.maintenance import maintenance_service, COMPONENT_SENSOR_MAP
from app.schemas.command import (
    CommandKPIs,
    FleetRiskRankItem,
    CommandAttentionQueueItem,
    TrendItem,
    FleetTrendSummary,
    ReadinessChangeItem,
    OperationalImpactAssessment,
    SubsystemReliabilityMetrics,
    CommandOverviewResponse,
)

logger = logging.getLogger("sentinelai.command")


class CommandIntelligenceEngine:
    """Unified Fleet Command Intelligence Engine for SentinelAI."""

    def get_command_kpis(self, db: Session) -> CommandKPIs:
        """Centralized aggregation across fleet assets, readiness, anomalies, and maintenance."""
        all_assets = asset_repo.get_multi(db, skip=0, limit=1000)
        total_assets = len(all_assets)

        assessment_map = readiness_repository.get_latest_assessment_map(db)

        ready_cnt = 0
        caution_cnt = 0
        degraded_cnt = 0
        not_ready_cnt = 0
        crit_risk_cnt = 0
        high_fail_cnt = 0
        active_anom_cnt = 0
        score_sum = 0.0

        for asset in all_assets:
            rec = assessment_map.get(asset.id)
            if not rec:
                try:
                    res = readiness_service.assess_asset(db, asset.id)
                    rec = readiness_repository.get_by_id(db, res.id)
                except Exception as e:
                    logger.warning(f"Failed assessment for asset {asset.asset_code}: {e}")
                    not_ready_cnt += 1
                    continue

            if rec:
                st = rec.readiness_state.upper()
                if st == "READY":
                    ready_cnt += 1
                elif st == "CAUTION":
                    caution_cnt += 1
                elif st == "DEGRADED":
                    degraded_cnt += 1
                elif st == "NOT_READY":
                    not_ready_cnt += 1
                else:
                    not_ready_cnt += 1

                score_sum += rec.readiness_score

                if rec.risk_level in ["CRITICAL", "HIGH"]:
                    crit_risk_cnt += 1
                if rec.failure_probability and rec.failure_probability >= 0.50:
                    high_fail_cnt += 1
                if rec.is_anomaly:
                    active_anom_cnt += 1

        fleet_index = round(score_sum / total_assets, 1) if total_assets > 0 else 100.0

        # Maintenance fleet KPIs
        maint_summary = maintenance_service.get_fleet_summary(db)
        open_recs_count = len(recommendation_repository.list_recommendations(db, status="OPEN", limit=1000)[0])

        return CommandKPIs(
            total_assets=total_assets,
            ready_assets=ready_cnt,
            caution_assets=caution_cnt,
            degraded_assets=degraded_cnt,
            not_ready_assets=not_ready_cnt,
            fleet_readiness_index=fleet_index,
            critical_risk_assets=crit_risk_cnt,
            active_anomaly_count=active_anom_cnt,
            high_failure_risk_assets=high_fail_cnt,
            assets_requiring_maintenance=maint_summary.total_assets_requiring_maintenance,
            overdue_maintenance=maint_summary.overdue_count,
            critical_interventions=maint_summary.critical_interventions,
            open_recommendations=open_recs_count,
        )

    def get_fleet_risk_ranking(self, db: Session) -> List[FleetRiskRankItem]:
        """Calculates a deterministic multi-criteria risk ranking across all fleet assets."""
        all_assets = asset_repo.get_multi(db, skip=0, limit=1000)
        assessment_map = readiness_repository.get_latest_assessment_map(db)

        items: List[Dict[str, Any]] = []

        for asset in all_assets:
            rec = assessment_map.get(asset.id)
            if not rec:
                continue

            fail_prob = rec.failure_probability or 0.0
            rul = rec.rul_hours
            is_anom = rec.is_anomaly or False

            # Maintenance status
            latest_maint = maintenance_repository.get_latest_record_for_asset(db, asset.id)
            # Check due state
            maint_assess = maintenance_service.assess_maintenance_due(
                db=db,
                asset=asset,
                latest_reading=None,
                pred=None,
                latest_maint=latest_maint,
            )
            maint_urgency = maint_assess.due_status

            # Multi-factor composite risk score (0 to 105 scale)
            # 1. Readiness state weight (max 40)
            state_pts = {"NOT_READY": 40.0, "DEGRADED": 25.0, "CAUTION": 12.0, "READY": 0.0}.get(
                rec.readiness_state.upper(), 0.0
            )

            # 2. Failure probability weight (max 25)
            prob_pts = fail_prob * 25.0

            # 3. RUL depletion weight (max 20)
            if rul is not None and rul < 15.0:
                rul_pts = 20.0
            elif rul is not None and rul < 35.0:
                rul_pts = 12.0
            elif rul is not None and rul < 50.0:
                rul_pts = 6.0
            else:
                rul_pts = 0.0

            # 4. Active anomaly weight (max 10)
            anom_pts = 10.0 if is_anom else 0.0

            # 5. Maintenance due state weight (max 10)
            maint_pts = {"URGENT": 10.0, "OVERDUE": 10.0, "DUE": 6.0, "UPCOMING": 3.0, "NOT_DUE": 0.0}.get(
                maint_urgency, 0.0
            )

            composite_score = round(state_pts + prob_pts + rul_pts + anom_pts + maint_pts, 1)

            # Determine primary risk reason
            reasons = []
            if rec.readiness_state.upper() in ["NOT_READY", "DEGRADED"]:
                reasons.append(f"readiness state {rec.readiness_state}")
            if fail_prob >= 0.50:
                reasons.append(f"failure probability {fail_prob * 100:.1f}%")
            if rul is not None and rul < 25.0:
                reasons.append(f"low RUL {rul:.1f}h")
            if is_anom:
                reasons.append("active sensor anomaly")
            if maint_urgency in ["URGENT", "OVERDUE"]:
                reasons.append(f"maintenance {maint_urgency}")

            risk_reason = "; ".join(reasons) if reasons else "Nominal operating telemetry and healthy RUL."

            items.append({
                "asset_id": asset.id,
                "asset_code": asset.asset_code,
                "asset_type": asset.asset_type,
                "model": asset.model,
                "location": asset.location,
                "risk_level": rec.risk_level,
                "readiness_state": rec.readiness_state,
                "readiness_score": rec.readiness_score,
                "failure_probability": fail_prob,
                "rul_hours": rul,
                "is_anomaly": is_anom,
                "maintenance_urgency": maint_urgency,
                "composite_risk_score": composite_score,
                "primary_risk_reason": risk_reason,
            })

        # Deterministic sorting: highest composite_score first, then highest fail_prob, then lowest readiness_score, then asset_id
        items.sort(
            key=lambda x: (
                -x["composite_risk_score"],
                -x["failure_probability"],
                x["readiness_score"],
                x["asset_id"],
            )
        )

        ranked: List[FleetRiskRankItem] = []
        for idx, itm in enumerate(items, start=1):
            ranked.append(FleetRiskRankItem(rank=idx, **itm))

        return ranked

    def get_command_attention_queue(
        self, db: Session, limit: int = 15, ranked_risks: Optional[List[FleetRiskRankItem]] = None
    ) -> List[CommandAttentionQueueItem]:
        """Unified command attention queue prioritizing assets requiring urgent command intervention."""
        if ranked_risks is None:
            ranked_risks = self.get_fleet_risk_ranking(db)
        queue: List[CommandAttentionQueueItem] = []

        for itm in ranked_risks:
            # Filter assets with actionable risk
            if itm.composite_risk_score < 15.0 and itm.readiness_state.upper() == "READY":
                continue

            # Prioritize attention
            if itm.readiness_state.upper() == "NOT_READY" or itm.composite_risk_score >= 60.0:
                priority = "CRITICAL"
                action = f"Ground asset immediately. Halt mission deployment and route to depot for {itm.primary_risk_reason}."
            elif itm.readiness_state.upper() == "DEGRADED" or itm.composite_risk_score >= 35.0:
                priority = "HIGH"
                action = f"Schedule immediate technical inspection within 48h. Verify sensor calibration and evaluate {itm.primary_risk_reason}."
            else:
                priority = "MEDIUM"
                action = "Schedule preventive servicing during next operational window. Maintain telemetry monitoring."

            evidence = f"Readiness: {itm.readiness_state} ({itm.readiness_score:.1f}%), Fail Prob: {itm.failure_probability * 100:.1f}%, RUL: {itm.rul_hours or 'N/A'}h, Maintenance: {itm.maintenance_urgency}."

            queue.append(
                CommandAttentionQueueItem(
                    rank=len(queue) + 1,
                    asset_id=itm.asset_id,
                    asset_code=itm.asset_code,
                    asset_type=itm.asset_type,
                    model=itm.model,
                    location=itm.location,
                    attention_priority=priority,
                    readiness_state=itm.readiness_state,
                    readiness_score=itm.readiness_score,
                    primary_issue=itm.primary_risk_reason,
                    evidence_summary=evidence,
                    recommended_next_action=action,
                )
            )

            if len(queue) >= limit:
                break

        return queue

    def get_trend_intelligence(self, db: Session, asset_id: Optional[int] = None) -> FleetTrendSummary:
        """Evaluates historical readiness assessments to identify fleet trajectories."""
        all_assets = [asset_repo.get(db, asset_id)] if asset_id else asset_repo.get_multi(db, skip=0, limit=1000)

        improving_cnt = 0
        stable_cnt = 0
        deteriorating_cnt = 0
        insufficient_cnt = 0
        trend_items: List[TrendItem] = []

        for asset in all_assets:
            if not asset:
                continue

            history, count = readiness_repository.list_history_by_asset(db, asset.id, skip=0, limit=10)
            if count < 2 or len(history) < 2:
                insufficient_cnt += 1
                curr_score = history[0].readiness_score if history else 0.0
                trend_items.append(
                    TrendItem(
                        asset_id=asset.id,
                        asset_code=asset.asset_code,
                        status="INSUFFICIENT_HISTORY",
                        current_score=curr_score,
                        previous_score=None,
                        score_delta=None,
                        historical_count=count,
                        explanation=f"Only {count} recorded assessment available. Minimum 2 assessments required for trend trajectory calculation.",
                    )
                )
                continue

            # Assessment history is ordered by created_at desc
            current = history[0]
            previous = history[1]
            delta = round(current.readiness_score - previous.readiness_score, 1)

            # Classify trajectory
            if delta >= 3.0 or (previous.readiness_state in ["NOT_READY", "DEGRADED"] and current.readiness_state in ["CAUTION", "READY"]):
                status = "READINESS_IMPROVING"
                improving_cnt += 1
                expl = f"Readiness score improved by +{delta:.1f} pts ({previous.readiness_score:.1f} -> {current.readiness_score:.1f}) across evaluation cycles."
            elif delta <= -3.0 or (previous.readiness_state in ["READY", "CAUTION"] and current.readiness_state in ["DEGRADED", "NOT_READY"]):
                status = "READINESS_DETERIORATING"
                deteriorating_cnt += 1
                expl = f"Readiness score declined by {delta:.1f} pts ({previous.readiness_score:.1f} -> {current.readiness_score:.1f}) due to elevated operational distress."
            else:
                status = "READINESS_STABLE"
                stable_cnt += 1
                expl = f"Readiness stable within {delta:+.1f} pts buffer ({previous.readiness_score:.1f} -> {current.readiness_score:.1f})."

            trend_items.append(
                TrendItem(
                    asset_id=asset.id,
                    asset_code=asset.asset_code,
                    status=status,
                    current_score=current.readiness_score,
                    previous_score=previous.readiness_score,
                    score_delta=delta,
                    historical_count=count,
                    explanation=expl,
                )
            )

        # Sort so deteriorating and improving are prominent
        order = {"READINESS_DETERIORATING": 1, "READINESS_IMPROVING": 2, "READINESS_STABLE": 3, "INSUFFICIENT_HISTORY": 4}
        trend_items.sort(key=lambda x: order.get(x.status, 5))

        return FleetTrendSummary(
            improving_count=improving_cnt,
            stable_count=stable_cnt,
            deteriorating_count=deteriorating_cnt,
            insufficient_history_count=insufficient_cnt,
            assets_with_trends=trend_items,
        )

    def get_recent_changes(self, db: Session, limit: int = 20) -> List[ReadinessChangeItem]:
        """Detects and returns chronological operational changes from PostgreSQL."""
        changes: List[ReadinessChangeItem] = []

        # 1. State changes from multi-assessment assets
        all_assets = asset_repo.get_multi(db, skip=0, limit=1000)
        for asset in all_assets:
            history, count = readiness_repository.list_history_by_asset(db, asset.id, skip=0, limit=5)
            if count >= 2 and len(history) >= 2:
                curr = history[0]
                prev = history[1]
                delta = curr.readiness_score - prev.readiness_score

                if curr.readiness_state != prev.readiness_state or abs(delta) >= 3.0:
                    change_type = "STATE_TRANSITION" if curr.readiness_state != prev.readiness_state else ("SCORE_DROP" if delta < 0 else "SCORE_RISE")
                    trigger = f"State shifted {prev.readiness_state} -> {curr.readiness_state} (Score: {prev.readiness_score:.1f} -> {curr.readiness_score:.1f}). Primary factor: {curr.primary_reason}."
                    changes.append(
                        ReadinessChangeItem(
                            asset_id=asset.id,
                            asset_code=asset.asset_code,
                            change_type=change_type,
                            previous_state=prev.readiness_state,
                            new_state=curr.readiness_state,
                            previous_score=prev.readiness_score,
                            new_score=curr.readiness_score,
                            trigger_evidence=trigger,
                            detected_at=curr.created_at or datetime.now(timezone.utc),
                        )
                    )

        # 2. Completed maintenance events
        recent_maint = (
            db.query(MaintenanceRecord)
            .filter(MaintenanceRecord.maintenance_status == "COMPLETED")
            .order_by(desc(MaintenanceRecord.maintenance_date))
            .limit(10)
            .all()
        )
        for m in recent_maint:
            asset = asset_repo.get(db, m.asset_id)
            if asset:
                changes.append(
                    ReadinessChangeItem(
                        asset_id=asset.id,
                        asset_code=asset.asset_code,
                        change_type="MAINTENANCE_COMPLETED",
                        previous_state="MAINTENANCE",
                        new_state=asset.status,
                        previous_score=None,
                        new_score=100.0,
                        trigger_evidence=f"Completed {m.maintenance_type} servicing on {m.component_type} (Parts: {m.parts_replaced}). Serviced by {m.technician}.",
                        detected_at=m.maintenance_date or datetime.now(timezone.utc),
                    )
                )

        # Sort by detected_at descending
        changes.sort(key=lambda x: x.detected_at, reverse=True)
        return changes[:limit]

    def get_operational_impact(self, db: Session, asset_id: int) -> OperationalImpactAssessment:
        """Determines operational impact of an asset's state backed by concrete metrics."""
        asset = asset_repo.get(db, asset_id)
        if not asset:
            raise ValueError(f"Asset with ID {asset_id} not found.")

        rec = readiness_repository.get_latest_by_asset(db, asset_id)
        if not rec:
            res = readiness_service.assess_asset(db, asset_id)
            rec = readiness_repository.get_by_id(db, res.id)

        fail_prob = rec.failure_probability or 0.0
        rul = rec.rul_hours
        is_anom = rec.is_anomaly or False

        consequences = []
        evidence = []

        # Impact evaluation
        if rec.readiness_state.upper() == "NOT_READY" or fail_prob >= 0.70:
            impact_level = "CRITICAL"
            consequences.append("Asset unavailable for sortie/deployment; ground depot isolation required.")
            consequences.append("Risk of catastrophic subsystem breakdown during operation.")
            suggested = "Perform immediate diagnostic teardown and replace degraded components before return to service."
        elif rec.readiness_state.upper() == "DEGRADED" or fail_prob >= 0.40 or (rul is not None and rul < 35.0):
            impact_level = "HIGH"
            consequences.append("Subsystem operation severely compromised; operational range restricted.")
            consequences.append("Accelerated wear trajectory on adjacent components.")
            suggested = "Schedule priority maintenance overhaul within 48 hours. Restrict flight/mission profile."
        elif rec.readiness_state.upper() == "CAUTION" or (rul is not None and rul < 50.0) or is_anom:
            impact_level = "MEDIUM"
            consequences.append("Operating with sub-nominal telemetry margins.")
            suggested = "Conduct sensor array recalibration and perform planned inspection during next servicing."
        else:
            impact_level = "LOW"
            consequences.append("Nominal operational profile; full mission readiness verified.")
            suggested = "Maintain standard HUMS surveillance."

        evidence.append(f"Readiness State: {rec.readiness_state} (Score: {rec.readiness_score:.1f}/100)")
        evidence.append(f"Model A Failure Risk: {fail_prob * 100:.1f}%")
        evidence.append(f"Prognostic RUL: {rul:.1f} hours" if rul is not None else "RUL: Nominal")
        if rec.predicted_failure_mode and rec.predicted_failure_mode != "No Failure":
            evidence.append(f"Diagnosed Mode: {rec.predicted_failure_mode}")
        if is_anom:
            evidence.append("HUMS telemetry anomaly confirmed on active channels")

        return OperationalImpactAssessment(
            asset_id=asset.id,
            asset_code=asset.asset_code,
            impact_level=impact_level,
            consequences=consequences,
            supporting_evidence=evidence,
            suggested_mitigation=suggested,
        )

    def get_subsystem_analytics(self, db: Session) -> List[SubsystemReliabilityMetrics]:
        """Aggregates real subsystem reliability, historical failures, and condition distributions."""
        subsystems = ["Engine", "Hydraulic System", "Fuel Pump", "Battery"]
        metrics: List[SubsystemReliabilityMetrics] = []

        # Get active intervention plans across the fleet
        maint_queue = maintenance_service.get_maintenance_queue(db=db, limit=200)
        target_counts: Dict[str, int] = {}
        for q in maint_queue:
            target_counts[q.target_component] = target_counts.get(q.target_component, 0) + 1

        for sub_name in subsystems:
            # 1. Historical maintenance records for this component
            records = (
                db.query(MaintenanceRecord)
                .filter(MaintenanceRecord.component_type.ilike(f"%{sub_name}%"))
                .all()
            )

            serviced_cnt = len(records)
            fail_cnt = sum(1 for r in records if r.failure_occurred)

            # Condition distribution
            cond_dist: Dict[str, int] = {"Good": 0, "Fair": 0, "Degraded": 0, "Poor": 0}
            parts_replaced_list: List[str] = []

            for r in records:
                c = r.component_condition or "Good"
                if c in cond_dist:
                    cond_dist[c] += 1
                else:
                    cond_dist["Good"] += 1

                if r.parts_replaced and r.parts_replaced != "None":
                    parts_replaced_list.append(r.parts_replaced)

            # Common parts
            from collections import Counter
            common_parts = [p for p, _ in Counter(parts_replaced_list).most_common(4)]

            # Correlated sensors active anomalies
            sensors = COMPONENT_SENSOR_MAP.get(sub_name, [])
            active_anoms = db.query(Anomaly).all()
            anom_cnt = sum(
                1 for a in active_anoms if any(s.lower() in (a.affected_sensor or "").lower() for s in sensors)
            )

            metrics.append(
                SubsystemReliabilityMetrics(
                    subsystem_name=sub_name,
                    active_anomaly_count=anom_cnt,
                    historical_failures=fail_cnt,
                    serviced_count=serviced_cnt,
                    condition_distribution=cond_dist,
                    target_intervention_count=target_counts.get(sub_name, 0),
                    common_parts_replaced=common_parts,
                )
            )

        return metrics

    def get_command_overview(self, db: Session) -> CommandOverviewResponse:
        """Master endpoint providing the comprehensive command intelligence snapshot."""
        kpis = self.get_command_kpis(db)
        risk_ranking = self.get_fleet_risk_ranking(db)
        attention_queue = self.get_command_attention_queue(db, limit=10, ranked_risks=risk_ranking)
        trends = self.get_trend_intelligence(db)
        recent_changes = self.get_recent_changes(db, limit=10)
        subsystem_metrics = self.get_subsystem_analytics(db)

        return CommandOverviewResponse(
            timestamp=datetime.now(timezone.utc),
            kpis=kpis,
            attention_queue=attention_queue,
            top_risk_ranking=risk_ranking[:10],
            trends=trends,
            recent_changes=recent_changes,
            subsystem_metrics=subsystem_metrics,
        )


command_service = CommandIntelligenceEngine()
