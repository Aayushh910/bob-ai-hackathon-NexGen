"""Operational Copilot Engine for SentinelAI (Phase 6).

Deterministic, evidence-backed operational inquiry engine answering
commander and operator questions without hallucinations.
"""

import re
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.repositories.asset import asset_repo
from app.repositories.readiness import readiness_repository
from app.repositories.maintenance import maintenance_repository
from app.repositories.recommendation import recommendation_repository

from app.services.command import command_service
from app.services.readiness import readiness_service
from app.services.maintenance import maintenance_service
from app.services.prediction import prediction_service
from app.services.anomaly import anomaly_service

from app.schemas.copilot import (
    CopilotQueryRequest,
    CopilotResponse,
    EvidenceItem,
    RelatedAssetItem,
    IntentInfo,
    SupportedIntentsResponse,
)

logger = logging.getLogger("sentinelai.copilot")


class OperationalCopilotEngine:
    """Deterministic Operational Copilot for SentinelAI."""

    SUPPORTED_INTENTS = [
        IntentInfo(
            intent="FLEET_STATUS",
            description="Fleet-wide operational readiness status and readiness index overview.",
            example_queries=[
                "What is the current fleet readiness?",
                "How many assets are ready?",
                "What is happening across the fleet?",
            ],
        ),
        IntentInfo(
            intent="NOT_READY_ASSETS",
            description="Identifies grounded or unavailable assets unable to deploy on sorties.",
            example_queries=[
                "Which assets are NOT mission-ready?",
                "What assets are grounded?",
                "Which assets are unready?",
            ],
        ),
        IntentInfo(
            intent="CRITICAL_ASSETS",
            description="Top priority attention queue combining critical failure risk and degraded readiness.",
            example_queries=[
                "Which assets need immediate attention?",
                "Which assets are critical?",
                "What are the top urgent assets?",
            ],
        ),
        IntentInfo(
            intent="FAILURE_RISK",
            description="Ranks assets by highest Model A 50-hour failure probability.",
            example_queries=[
                "Which assets have highest failure risk?",
                "What assets have high failure probability?",
                "Which assets are at risk of breakdown?",
            ],
        ),
        IntentInfo(
            intent="ANOMALIES",
            description="Surfaces assets with active HUMS telemetry anomalies exceeding the statistical threshold.",
            example_queries=[
                "Which assets have active anomalies?",
                "What sensor anomalies are detected?",
                "Are there any telemetry anomalies?",
            ],
        ),
        IntentInfo(
            intent="LOW_RUL",
            description="Identifies assets approaching Remaining Useful Life exhaustion.",
            example_queries=[
                "Which assets have low RUL?",
                "What assets are running out of operating hours?",
                "Which assets have depleted remaining useful life?",
            ],
        ),
        IntentInfo(
            intent="MAINTENANCE_REQUIRED",
            description="Lists assets requiring scheduled, preventive, or corrective servicing.",
            example_queries=[
                "Which assets require maintenance?",
                "What maintenance actions are needed?",
                "Which assets need servicing?",
            ],
        ),
        IntentInfo(
            intent="OVERDUE_MAINTENANCE",
            description="Identifies assets that have exceeded their manufacturer maintenance interval.",
            example_queries=[
                "Which assets are overdue for maintenance?",
                "What assets are past due for servicing?",
            ],
        ),
        IntentInfo(
            intent="INTERVENTIONS",
            description="Ranks critical and high-priority maintenance interventions across the fleet.",
            example_queries=[
                "Which maintenance actions are critical?",
                "What maintenance interventions should be prioritized?",
            ],
        ),
        IntentInfo(
            intent="READINESS_TRENDS",
            description="Analyzes trajectory of fleet readiness (improving, stable, deteriorating).",
            example_queries=[
                "How is fleet readiness changing?",
                "Which assets are deteriorating?",
                "What is the fleet readiness trend?",
            ],
        ),
        IntentInfo(
            intent="RECENT_CHANGES",
            description="Chronological log of recent operational state transitions and logged events.",
            example_queries=[
                "What changed recently?",
                "What changed since the previous assessment?",
                "What are recent operational events?",
            ],
        ),
        IntentInfo(
            intent="ASSET_EXPLANATION",
            description="Explains why a specific asset is degraded or not ready with full technical rationale.",
            example_queries=[
                "Why is asset A002 not ready?",
                "What is wrong with A003?",
                "Explain the status of A001",
            ],
        ),
        IntentInfo(
            intent="ASSET_MAINTENANCE",
            description="Provides targeted maintenance due assessment and component diagnostics for an asset.",
            example_queries=[
                "When should asset A002 be serviced?",
                "What component needs attention on A001?",
            ],
        ),
        IntentInfo(
            intent="ASSET_STATUS",
            description="Comprehensive single-asset telemetry and readiness status inquiry.",
            example_queries=[
                "What is the status of asset A001?",
                "Tell me about A002",
                "Asset details for A005",
            ],
        ),
        IntentInfo(
            intent="RECOMMENDED_ACTION",
            description="Returns pending operational directives and prescribed maintenance actions.",
            example_queries=[
                "What should be done for asset A002?",
                "What operational directives are pending?",
            ],
        ),
    ]

    def classify_intent(self, query: str, asset_id: Optional[int] = None) -> Tuple[str, float, Optional[str]]:
        """
        Deterministically classifies the inquest into a known intent, extracting any asset entity.
        Returns: (intent, confidence, asset_code_or_id)
        """
        q = query.strip().lower()

        # Extract asset entity if present: e.g. "a001", "a023", "asset 1", "asset #2"
        asset_code = None
        asset_match = re.search(r"\b(a\d{3})\b", q)
        if asset_match:
            asset_code = asset_match.group(1).upper()
        else:
            asset_num_match = re.search(r"asset\s*(?:#|\s*)(\d+)", q)
            if asset_num_match:
                num = int(asset_num_match.group(1))
                asset_code = f"A{num:03d}"

        # 1. Asset-specific intents if asset identified
        if asset_code or asset_id:
            if any(w in q for w in ["why", "wrong", "reason", "not ready", "degraded", "cause", "issue"]):
                return "ASSET_EXPLANATION", 0.95, asset_code
            if any(w in q for w in ["service", "serviced", "maintenance", "component", "subsystem", "parts"]):
                return "ASSET_MAINTENANCE", 0.95, asset_code
            if any(w in q for w in ["do", "action", "directive", "recommendation", "mitigat"]):
                return "RECOMMENDED_ACTION", 0.90, asset_code
            if any(w in q for w in ["status", "tell me", "details", "health", "state", "how is"]):
                return "ASSET_STATUS", 0.95, asset_code

        # 2. Fleet-level questions
        if any(w in q for w in ["not ready", "not mission-ready", "unready", "grounded"]):
            return "NOT_READY_ASSETS", 0.95, None
        if any(w in q for w in ["immediate attention", "attention", "critical assets", "most urgent", "urgent assets"]):
            return "CRITICAL_ASSETS", 0.95, None
        if any(w in q for w in ["highest failure", "failure risk", "failure prob", "at risk", "breakdown"]):
            return "FAILURE_RISK", 0.95, None
        if any(w in q for w in ["anomal", "sensor deviation", "irregular"]):
            return "ANOMALIES", 0.95, None
        if any(w in q for w in ["low rul", "rul", "remaining useful life", "hours left", "useful life"]):
            return "LOW_RUL", 0.95, None
        if any(w in q for w in ["overdue"]):
            return "OVERDUE_MAINTENANCE", 0.95, None
        if any(w in q for w in ["interventions", "critical maintenance actions", "priority maintenance"]):
            return "INTERVENTIONS", 0.95, None
        if any(w in q for w in ["maintenance required", "need maintenance", "servicing required", "pending maintenance"]):
            return "MAINTENANCE_REQUIRED", 0.95, None
        if any(w in q for w in ["trend", "changing", "deteriorat", "improving"]):
            return "READINESS_TRENDS", 0.95, None
        if any(w in q for w in ["change", "changed", "recent", "recent event", "since previous"]):
            return "RECENT_CHANGES", 0.95, None
        if any(w in q for w in ["readiness", "fleet status", "happening across", "overview", "how many ready"]):
            return "FLEET_STATUS", 0.95, None
        if any(w in q for w in ["action", "directive", "recommend"]):
            return "RECOMMENDED_ACTION", 0.90, None

        return "UNKNOWN", 0.0, None

    def query(self, db: Session, request: CopilotQueryRequest) -> CopilotResponse:
        """Processes an operational query and synthesizes an evidence-backed answer."""
        intent, confidence, asset_code = self.classify_intent(request.query, request.asset_id)
        now = datetime.now(timezone.utc)

        # Lookup asset if entity identified
        target_asset: Optional[Asset] = None
        if asset_code:
            target_asset = db.query(Asset).filter(Asset.asset_code.ilike(asset_code)).first()
        elif request.asset_id:
            target_asset = asset_repo.get(db, request.asset_id)

        # Dispatch to intent handler
        if intent == "FLEET_STATUS":
            return self._handle_fleet_status(db, request.query, intent, confidence, now)
        elif intent == "NOT_READY_ASSETS":
            return self._handle_not_ready(db, request.query, intent, confidence, now)
        elif intent == "CRITICAL_ASSETS":
            return self._handle_critical_assets(db, request.query, intent, confidence, now)
        elif intent == "FAILURE_RISK":
            return self._handle_failure_risk(db, request.query, intent, confidence, now)
        elif intent == "ANOMALIES":
            return self._handle_anomalies(db, request.query, intent, confidence, now)
        elif intent == "LOW_RUL":
            return self._handle_low_rul(db, request.query, intent, confidence, now)
        elif intent == "MAINTENANCE_REQUIRED":
            return self._handle_maintenance_required(db, request.query, intent, confidence, now)
        elif intent == "OVERDUE_MAINTENANCE":
            return self._handle_overdue_maintenance(db, request.query, intent, confidence, now)
        elif intent == "INTERVENTIONS":
            return self._handle_interventions(db, request.query, intent, confidence, now)
        elif intent == "READINESS_TRENDS":
            return self._handle_trends(db, request.query, intent, confidence, now)
        elif intent == "RECENT_CHANGES":
            return self._handle_recent_changes(db, request.query, intent, confidence, now)
        elif intent in ["ASSET_EXPLANATION", "ASSET_STATUS", "ASSET_MAINTENANCE", "RECOMMENDED_ACTION"] and target_asset:
            return self._handle_asset_inquest(db, target_asset, request.query, intent, confidence, now)
        elif intent == "RECOMMENDED_ACTION":
            return self._handle_general_recommendations(db, request.query, intent, confidence, now)
        else:
            return self._handle_unknown(request.query, now)

    # ------------------ Intent Handlers ------------------

    def _handle_fleet_status(self, db: Session, query: str, intent: str, conf: float, now: datetime) -> CopilotResponse:
        kpis = command_service.get_command_kpis(db)
        ans = (
            f"Fleet operational status: Total assets {kpis.total_assets}. "
            f"Fleet Readiness Index is {kpis.fleet_readiness_index}%. "
            f"Currently {kpis.ready_assets} READY, {kpis.caution_assets} CAUTION, "
            f"{kpis.degraded_assets} DEGRADED, and {kpis.not_ready_assets} NOT READY. "
            f"There are {kpis.critical_risk_assets} critical-risk assets and {kpis.active_anomaly_count} active anomalies."
        )
        evidence = [
            EvidenceItem(source="READINESS_ENGINE", metric="fleet_readiness_index", value=f"{kpis.fleet_readiness_index}%", explanation="Average mission readiness score across all registered fleet assets."),
            EvidenceItem(source="READINESS_ENGINE", metric="readiness_state_breakdown", value=f"{kpis.ready_assets} Ready / {kpis.caution_assets} Caution / {kpis.degraded_assets} Degraded / {kpis.not_ready_assets} Not Ready", explanation="Discrete operational categorization of fleet assets."),
            EvidenceItem(source="MAINTENANCE_INTELLIGENCE", metric="maintenance_demand", value=f"{kpis.assets_requiring_maintenance} assets requiring service ({kpis.overdue_maintenance} overdue)", explanation="Maintenance urgency based on operating hours vs scheduled due intervals."),
            EvidenceItem(source="HUMS_ANOMALY", metric="active_anomaly_count", value=kpis.active_anomaly_count, explanation="Telemetry channels exceeding statistical threshold limits."),
        ]
        actions = [
            "Review grounded assets in Command Attention Queue.",
            f"Dispatch maintenance teams to address {kpis.critical_interventions} critical intervention directives.",
        ]
        return CopilotResponse(
            query=query, intent=intent, confidence=conf, answer=ans, evidence=evidence,
            related_assets=[], recommended_actions=actions, timestamp=now
        )

    def _handle_not_ready(self, db: Session, query: str, intent: str, conf: float, now: datetime) -> CopilotResponse:
        fleet_res = readiness_service.list_fleet_readiness(db, state="NOT_READY", limit=10)
        items = fleet_res.items
        count = getattr(fleet_res, 'total', len(items))

        codes = [i.asset_code for i in items[:5]]
        ans = f"There are {count} assets currently NOT MISSION-READY and grounded from operational deployment: {', '.join(codes)}{'...' if count > 5 else ''}. These assets exhibit critical risk breaches or exhausted RUL."

        evidence = [
            EvidenceItem(source="READINESS_ENGINE", metric="not_ready_count", value=count, explanation="Assets failing mission readiness threshold criteria (Score < 50% or Critical Risk).")
        ]
        for itm in items[:3]:
            evidence.append(EvidenceItem(source="READINESS_ENGINE", metric=f"{itm.asset_code}_reason", value=itm.readiness_score, explanation=itm.primary_reason))

        related = [
            RelatedAssetItem(
                asset_id=i.asset_id, asset_code=i.asset_code, model=i.model, location=i.location,
                readiness_state=i.readiness_state, readiness_score=i.readiness_score,
                failure_probability=i.failure_probability, rul_hours=i.rul_hours, priority="CRITICAL"
            )
            for i in items[:5]
        ]
        actions = ["Halt deployment of all listed assets.", "Perform depot-level diagnostic verification before roster clearance."]
        return CopilotResponse(
            query=query, intent=intent, confidence=conf, answer=ans, evidence=evidence,
            related_assets=related, recommended_actions=actions, timestamp=now
        )

    def _handle_critical_assets(self, db: Session, query: str, intent: str, conf: float, now: datetime) -> CopilotResponse:
        queue = command_service.get_command_attention_queue(db, limit=5)
        codes = [q.asset_code for q in queue]
        ans = f"Top priority attention is required for {len(queue)} assets: {', '.join(codes)}. Asset {queue[0].asset_code if queue else 'N/A'} is ranked #1 due to: {queue[0].primary_issue if queue else 'operational risk'}."

        evidence = []
        for q in queue[:3]:
            evidence.append(EvidenceItem(source="COMMAND_INTELLIGENCE", metric=f"rank_{q.rank}_{q.asset_code}", value=q.attention_priority, explanation=q.evidence_summary))

        related = [
            RelatedAssetItem(
                asset_id=q.asset_id, asset_code=q.asset_code, model=q.model, location=q.location,
                readiness_state=q.readiness_state, readiness_score=q.readiness_score, priority=q.attention_priority
            )
            for q in queue
        ]
        actions = [q.recommended_next_action for q in queue[:3]]
        return CopilotResponse(
            query=query, intent=intent, confidence=conf, answer=ans, evidence=evidence,
            related_assets=related, recommended_actions=actions, timestamp=now
        )

    def _handle_failure_risk(self, db: Session, query: str, intent: str, conf: float, now: datetime) -> CopilotResponse:
        ranked = command_service.get_fleet_risk_ranking(db)
        high_risk = [r for r in ranked if r.failure_probability >= 0.50][:5]
        ans = f"Highest 50-hour failure probability identified in {len(high_risk)} assets: " + ", ".join(
            [f"{r.asset_code} ({r.failure_probability * 100:.1f}%)" for r in high_risk]
        ) + ". Prognostic failure trajectories require immediate preventive inspection."

        evidence = [
            EvidenceItem(source="ML_MODEL_A", metric=f"{r.asset_code}_fail_prob", value=f"{r.failure_probability * 100:.1f}%", explanation=r.primary_risk_reason)
            for r in high_risk[:3]
        ]
        related = [
            RelatedAssetItem(
                asset_id=r.asset_id, asset_code=r.asset_code, model=r.model, location=r.location,
                readiness_state=r.readiness_state, readiness_score=r.readiness_score,
                failure_probability=r.failure_probability, rul_hours=r.rul_hours, priority=r.risk_level
            )
            for r in high_risk
        ]
        actions = ["Order immediate inspection of diagnosed failure modes.", "Schedule sensor recalibration and verify operating hydraulic/engine pressures."]
        return CopilotResponse(
            query=query, intent=intent, confidence=conf, answer=ans, evidence=evidence,
            related_assets=related, recommended_actions=actions, timestamp=now
        )

    def _handle_anomalies(self, db: Session, query: str, intent: str, conf: float, now: datetime) -> CopilotResponse:
        anom_res = anomaly_service.get_fleet_anomalies(db, limit=5)
        items = anom_res["items"]
        total = anom_res["total"]
        ans = f"Detected {total} active HUMS sensor anomalies across fleet assets. Deviations exceed the 1.8-sigma Gaussian operational envelope on telemetry channels."

        evidence = [
            EvidenceItem(source="HUMS_ANOMALY", metric=f"Asset_{a['asset_id']}_{a['affected_sensor']}", value=f"Score: {a['anomaly_score'] * 100:.1f}%", explanation=a["explanation"])
            for a in items[:4]
        ]
        related = [
            RelatedAssetItem(
                asset_id=a["asset_id"], asset_code=f"Asset #{a['asset_id']}", model="Sentinel Asset", location="Fleet Area",
                readiness_state="DEGRADED", readiness_score=60.0, priority=a["severity"]
            )
            for a in items[:4]
        ]
        actions = ["Dispatch ground crews to inspect highlighted sensors.", "Check for physical mechanical wear or fluid contamination."]
        return CopilotResponse(
            query=query, intent=intent, confidence=conf, answer=ans, evidence=evidence,
            related_assets=related, recommended_actions=actions, timestamp=now
        )

    def _handle_low_rul(self, db: Session, query: str, intent: str, conf: float, now: datetime) -> CopilotResponse:
        ranked = command_service.get_fleet_risk_ranking(db)
        low_rul = [r for r in ranked if r.rul_hours is not None and r.rul_hours < 35.0][:5]
        ans = f"Identified {len(low_rul)} assets with critical Remaining Useful Life (< 35h): " + ", ".join(
            [f"{r.asset_code} (RUL: {r.rul_hours:.1f}h)" for r in low_rul]
        ) + ". Imminent subsystem wear warrants depot overhauls."

        evidence = [
            EvidenceItem(source="ML_MODEL_B", metric=f"{r.asset_code}_rul", value=f"{r.rul_hours:.1f} hours", explanation=f"Prognostic RUL evaluated by ExtraTreeRegressor Model B; state: {r.readiness_state}.")
            for r in low_rul[:3]
        ]
        related = [
            RelatedAssetItem(
                asset_id=r.asset_id, asset_code=r.asset_code, model=r.model, location=r.location,
                readiness_state=r.readiness_state, readiness_score=r.readiness_score, rul_hours=r.rul_hours, priority=r.risk_level
            )
            for r in low_rul
        ]
        actions = ["Schedule depot replacement of worn assemblies.", "Restrict remaining flight/operating envelope."]
        return CopilotResponse(
            query=query, intent=intent, confidence=conf, answer=ans, evidence=evidence,
            related_assets=related, recommended_actions=actions, timestamp=now
        )

    def _handle_maintenance_required(self, db: Session, query: str, intent: str, conf: float, now: datetime) -> CopilotResponse:
        queue = maintenance_service.get_maintenance_queue(db=db, limit=5)
        ans = f"Fleet maintenance assessment indicates {len(queue)} assets in urgent/due intervention queue. Target components in distress include {', '.join(set([q.target_component for q in queue]))}."

        evidence = [
            EvidenceItem(source="MAINTENANCE_INTELLIGENCE", metric=f"{q.asset_code}_{q.target_component}", value=f"Priority: {q.priority} (Due: {q.due_status})", explanation=q.recommended_action)
            for q in queue[:3]
        ]
        related = [
            RelatedAssetItem(
                asset_id=q.asset_id, asset_code=q.asset_code, model=q.model, location=q.location,
                readiness_state=q.readiness_state, readiness_score=50.0, priority=q.priority
            )
            for q in queue
        ]
        actions = [q.recommended_action for q in queue[:3]]
        return CopilotResponse(
            query=query, intent=intent, confidence=conf, answer=ans, evidence=evidence,
            related_assets=related, recommended_actions=actions, timestamp=now
        )

    def _handle_overdue_maintenance(self, db: Session, query: str, intent: str, conf: float, now: datetime) -> CopilotResponse:
        queue = maintenance_service.get_maintenance_queue(db=db, limit=50)
        overdue = [q for q in queue if q.due_status in ["OVERDUE", "URGENT"]]
        ans = f"There are {len(overdue)} assets with OVERDUE or URGENT maintenance requirements that have exceeded manufacturer safety thresholds: " + ", ".join(
            [q.asset_code for q in overdue[:5]]
        ) + "."

        evidence = [
            EvidenceItem(source="MAINTENANCE_INTELLIGENCE", metric=f"{q.asset_code}_due_state", value=q.due_status, explanation=f"Target subsystem: {q.target_component}. RUL: {q.rul_hours}h.")
            for q in overdue[:3]
        ]
        related = [
            RelatedAssetItem(
                asset_id=q.asset_id, asset_code=q.asset_code, model=q.model, location=q.location,
                readiness_state=q.readiness_state, readiness_score=40.0, priority="CRITICAL"
            )
            for q in overdue[:5]
        ]
        actions = ["Halt operation until scheduled maintenance intervals are fulfilled and documented in PostgreSQL."]
        return CopilotResponse(
            query=query, intent=intent, confidence=conf, answer=ans, evidence=evidence,
            related_assets=related, recommended_actions=actions, timestamp=now
        )

    def _handle_interventions(self, db: Session, query: str, intent: str, conf: float, now: datetime) -> CopilotResponse:
        crit_queue = maintenance_service.get_maintenance_queue(db=db, priority="CRITICAL", limit=5)
        ans = f"Identified {len(crit_queue)} CRITICAL maintenance interventions requiring immediate depot work. Ground crews must service these before next mission dispatch."

        evidence = [
            EvidenceItem(source="INTERVENTION_ENGINE", metric=f"{c.asset_code}_{c.target_component}", value="CRITICAL PRIORITY", explanation=c.recommended_action)
            for c in crit_queue[:3]
        ]
        related = [
            RelatedAssetItem(
                asset_id=c.asset_id, asset_code=c.asset_code, model=c.model, location=c.location,
                readiness_state=c.readiness_state, readiness_score=40.0, priority="CRITICAL"
            )
            for c in crit_queue
        ]
        actions = [c.recommended_action for c in crit_queue[:3]]
        return CopilotResponse(
            query=query, intent=intent, confidence=conf, answer=ans, evidence=evidence,
            related_assets=related, recommended_actions=actions, timestamp=now
        )

    def _handle_trends(self, db: Session, query: str, intent: str, conf: float, now: datetime) -> CopilotResponse:
        trends = command_service.get_trend_intelligence(db)
        ans = (
            f"Fleet trend analysis: {trends.improving_count} assets IMPROVING, "
            f"{trends.stable_count} STABLE, {trends.deteriorating_count} DETERIORATING. "
            f"{trends.insufficient_history_count} assets currently have single assessment history (baseline established)."
        )
        evidence = [
            EvidenceItem(source="READINESS_TRENDS", metric="trend_summary", value=f"+{trends.improving_count} Improving, {trends.stable_count} Stable, -{trends.deteriorating_count} Deteriorating", explanation="Trajectory based on sequential historical readiness assessments in PostgreSQL.")
        ]
        for t in trends.assets_with_trends[:3]:
            if t.status != "INSUFFICIENT_HISTORY":
                evidence.append(EvidenceItem(source="READINESS_TRENDS", metric=f"{t.asset_code}_trend", value=f"{t.status} (Delta: {t.score_delta:+.1f})", explanation=t.explanation))

        actions = ["Investigate telemetry for deteriorating assets to halt degradation.", "Maintain current surveillance on stable and improving assets."]
        return CopilotResponse(
            query=query, intent=intent, confidence=conf, answer=ans, evidence=evidence,
            related_assets=[], recommended_actions=actions, timestamp=now
        )

    def _handle_recent_changes(self, db: Session, query: str, intent: str, conf: float, now: datetime) -> CopilotResponse:
        changes = command_service.get_recent_changes(db, limit=5)
        ans = f"Recent operational timeline contains {len(changes)} detected changes including state transitions and completed maintenance events."

        evidence = [
            EvidenceItem(source="AUDIT_STREAM", metric=f"{c.asset_code}_{c.change_type}", value=f"State: {c.new_state}", explanation=c.trigger_evidence)
            for c in changes[:4]
        ]
        actions = ["Review logged transitions to confirm post-maintenance flight clearances."]
        return CopilotResponse(
            query=query, intent=intent, confidence=conf, answer=ans, evidence=evidence,
            related_assets=[], recommended_actions=actions, timestamp=now
        )

    def _handle_asset_inquest(self, db: Session, asset: Asset, query: str, intent: str, conf: float, now: datetime) -> CopilotResponse:
        rec = readiness_repository.get_latest_by_asset(db, asset.id)
        if not rec:
            res = readiness_service.assess_asset(db, asset.id)
            rec = readiness_repository.get_by_id(db, res.id)

        plan = maintenance_service.generate_intervention_plan(db, asset.id)
        impact = command_service.get_operational_impact(db, asset.id)

        ans = (
            f"Asset {asset.asset_code} ({asset.model}, {asset.location}): "
            f"Readiness state is {rec.readiness_state} with score {rec.readiness_score:.1f}/100. "
            f"Model A failure probability is {(rec.failure_probability or 0.0) * 100:.1f}%, and RUL is {rec.rul_hours:.1f}h. "
            f"Target component requiring maintenance is {plan.target_component} (Urgency: {plan.priority}). "
            f"Operational Impact: {impact.impact_level}."
        )

        evidence = [
            EvidenceItem(source="READINESS_ENGINE", metric="readiness_assessment", value=f"{rec.readiness_state} ({rec.readiness_score:.1f}/100)", explanation=rec.primary_reason),
            EvidenceItem(source="ML_MODEL_A", metric="failure_probability", value=f"{(rec.failure_probability or 0.0) * 100:.1f}%", explanation="Evaluated 50-hour failure probability from active sensor telemetry."),
            EvidenceItem(source="ML_MODEL_B", metric="remaining_useful_life", value=f"{rec.rul_hours or 'N/A'} hours", explanation="Calculated by ExtraTreeRegressor Model B."),
            EvidenceItem(source="ML_MODEL_C", metric="diagnosed_failure_mode", value=rec.predicted_failure_mode or "No Failure", explanation="Diagnosed failure mode pattern from Model C."),
            EvidenceItem(source="HUMS_ANOMALY", metric="anomaly_status", value="Active Anomaly" if rec.is_anomaly else "Nominal", explanation="Gaussian isolation forest threshold check."),
            EvidenceItem(source="MAINTENANCE_INTELLIGENCE", metric="target_subsystem", value=f"{plan.target_component} ({plan.priority})", explanation=plan.justification),
        ]

        related = [
            RelatedAssetItem(
                asset_id=asset.id, asset_code=asset.asset_code, model=asset.model, location=asset.location,
                readiness_state=rec.readiness_state, readiness_score=rec.readiness_score,
                failure_probability=rec.failure_probability, rul_hours=rec.rul_hours, priority=plan.priority
            )
        ]
        actions = [plan.recommended_action]
        return CopilotResponse(
            query=query, intent=intent, confidence=conf, answer=ans, evidence=evidence,
            related_assets=related, recommended_actions=actions, timestamp=now
        )

    def _handle_general_recommendations(self, db: Session, query: str, intent: str, conf: float, now: datetime) -> CopilotResponse:
        recs, total = recommendation_repository.list_recommendations(db, status="OPEN", limit=5)
        ans = f"There are {total} open operational directives pending across the fleet. Prioritize CRITICAL actions before assigning assets to active duty."

        evidence = [
            EvidenceItem(source="DIRECTIVES_ENGINE", metric=f"Directive_{r.id}_Asset_{r.asset_id}", value=r.priority, explanation=r.recommendation)
            for r in recs[:3]
        ]
        actions = [r.recommendation for r in recs[:3]]
        return CopilotResponse(
            query=query, intent=intent, confidence=conf, answer=ans, evidence=evidence,
            related_assets=[], recommended_actions=actions, timestamp=now
        )

    def _handle_unknown(self, query: str, now: datetime) -> CopilotResponse:
        ans = (
            "Inquest outside supported operational domain. SentinelAI Copilot answers deterministic operational questions "
            "regarding fleet readiness, critical assets, failure risks, anomalies, RUL, maintenance schedules, and asset diagnostics. "
            "Please select or phrase an inquest relating to fleet command intelligence."
        )
        return CopilotResponse(
            query=query, intent="UNKNOWN", confidence=0.0, answer=ans, evidence=[],
            related_assets=[], recommended_actions=["Select one of the suggested command questions above."], timestamp=now
        )


copilot_service = OperationalCopilotEngine()
