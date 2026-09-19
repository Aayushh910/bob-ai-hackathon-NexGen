"""SentinelAI Chatbot Service — Intelligence Upgrade.

Provides an enterprise-grade AI assistant for SentinelAI:
- Robust multi-pattern entity extraction (any length asset IDs, comparisons)
- Natural language synonym normalization (e.g. "bad assets", "unhealthy machines")
- Short query understanding ("A021", "A021 status", "failure?", "risk?", "bad ones")
- Strict context management and topic reset to eliminate stale context pollution
- Component-based troubleshooting engine grounded in real Neon DB data
- Side-by-side asset comparison and historical trend evaluation
- Clear operational states: FOUND, NOT_FOUND, EMPTY_RESULT, DATABASE_ERROR
- Dynamic context-aware suggestion chips for next-step inquiries
"""

import re
import logging
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models.asset import Asset
from app.models.status import AssetStatus
from app.models.prediction import Prediction
from app.models.anomaly import Anomaly
from app.models.sensor import SensorReading
from app.models.maintenance import MaintenanceRecord
from app.schemas.chat import ChatMessage, ChatRequest, ChatResponse, NavigationAction
from app.services.ibm_bob_client import ibm_bob_client
from app.services.troubleshooting_engine import troubleshooting_engine
from app.services.semantic_intent import semantic_understanding_engine

logger = logging.getLogger("sentinelai.chat_service")


# Verified SentinelAI Project Knowledge Base
PROJECT_KNOWLEDGE = {
    "sentinelai": (
        "## 🛡️ SentinelAI Platform Overview\n\n"
        "**SentinelAI** is an autonomous mission readiness and predictive maintenance platform built for defense and tactical fleets. "
        "It continuously monitors multi-channel telemetry (heat, vibration, hydraulic pressure, oil pressure, fuel pressure, RPM, voltage), "
        "predicts mechanical breakdowns up to **50 operating hours in advance**, forecasts Remaining Useful Life (RUL), "
        "and provides operations commanders with deterministic evidence on asset deployability."
    ),
    "models": (
        "## 🧠 SentinelAI Machine Learning Architecture\n\n"
        "SentinelAI employs a 4-stage multi-model inference pipeline:\n\n"
        "1. **Anomaly Detection Engine (Isolation Forest):** Unsupervised outlier detection identifying abnormal sensor patterns across multi-channel telemetry.\n"
        "2. **Failure Probability Model (Model A — Random Forest):** Predicts the mathematical probability (0–100%) of catastrophic component breakdown within the next 50 operating hours.\n"
        "3. **Remaining Useful Life (Model B — Extra Trees Regressor):** Forecasts exact remaining operating hours (0 to 100+ hours) prior to required depot overhaul.\n"
        "4. **Root-Cause Diagnostics (Model C — Multiclass Classifier & TreeSHAP):** Isolates the exact degraded subsystem (Engine, Hydraulic System, Fuel Pump, Battery) with causal feature attribution."
    ),
    "readiness": (
        "## 🚦 4-Tier Mission Readiness Framework\n\n"
        "SentinelAI classifies operational readiness into four deterministic tiers:\n\n"
        "- 🟢 **READY (Score 80–100):** Healthy telemetry. Fully cleared for unrestricted combat sorties.\n"
        "- 🟡 **CAUTION (Score 60–79):** Minor telemetry drift or wear. Cleared for secondary or training missions.\n"
        "- 🟠 **DEGRADED (Score 40–59):** Elevated failure risk. Restricted operations with pre-staged maintenance.\n"
        "- 🔴 **NOT_READY (Score 0–39):** Critical failure risk or depleted RUL. **Grounded immediately** for depot repair."
    ),
    "dashboard": (
        "## 🖥️ SentinelAI Dashboard & Capabilities\n\n"
        "The SentinelAI interface provides commanders and engineers with real-time operational views:\n\n"
        "- **Mission Overview (`/overview`):** High-level fleet readiness KPIs, operational posture, and priority queue.\n"
        "- **Fleet Assets (`/fleet`):** Complete asset inventory with deep-dive telemetry diagnostics and subsystem inspection.\n"
        "- **Failure Predictions (`/predictions`):** 50-hour prognostic failure probabilities, health scores, and TreeSHAP feature attributions.\n"
        "- **Sensor Trends & Anomalies (`/trends`):** Multi-channel sensor traces, statistical deviation thresholds, and HUMS alerts.\n"
        "- **Reports & Exports (`/reports`):** Filtered maintenance records, readiness audits, and CSV/PDF data exports.\n"
        "- **System Settings (`/settings`):** Backend health verification, database connectivity, and telemetry configuration."
    ),
}

# Frontend Navigation Map matching actual App.jsx tabs
NAVIGATION_MAP = {
    "fleet": NavigationAction(
        label="Open Fleet Assets",
        route="/fleet",
        breadcrumb=["Dashboard", "Fleet Assets"]
    ),
    "predictions": NavigationAction(
        label="Open Predictions",
        route="/predictions",
        breadcrumb=["Dashboard", "Predictions"]
    ),
    "trends": NavigationAction(
        label="Open Sensor Trends & Anomalies",
        route="/trends",
        breadcrumb=["Dashboard", "Trends & Health"]
    ),
    "reports": NavigationAction(
        label="Open Reports",
        route="/reports",
        breadcrumb=["Dashboard", "Reports"]
    ),
    "overview": NavigationAction(
        label="Open Mission Overview",
        route="/overview",
        breadcrumb=["Dashboard", "Overview"]
    ),
    "settings": NavigationAction(
        label="Open System Settings",
        route="/settings",
        breadcrumb=["Dashboard", "Settings"]
    ),
}


class ChatService:
    """Core conversational engine powering the SentinelAI assistant."""

    # ------------------ Robust Entity Extraction ------------------

    def extract_all_asset_codes(self, text_str: str) -> List[str]:
        """
        Extracts all asset identifiers from text (e.g. A001, A021, A102, platform A021, unit 21).
        Supports comparisons where two or more assets are mentioned (e.g. 'Compare A021 and A035').
        """
        if not text_str:
            return []
        _, codes = semantic_understanding_engine.extract_asset_entities(text_str, history=None)
        return codes

    def resolve_asset_entities(self, message: str, history: List[ChatMessage]) -> Tuple[Optional[str], List[str]]:
        """
        Extracts asset codes from the current message, resolving referential markers,
        ordinals, pronouns, and conversational follow-ups from history when needed.
        """
        primary, all_codes = semantic_understanding_engine.extract_asset_entities(message, history=history)
        if primary:
            return primary, all_codes
        return None, []

    # ------------------ Intent Understanding & Normalization ------------------

    def classify_intent(
        self,
        message: str,
        asset_code: Optional[str],
        all_asset_codes: List[str],
        history: Optional[List[ChatMessage]] = None
    ) -> Tuple[str, str, float]:
        """
        Translates natural language into a structured internal intent:
        Returns: (responseType, subIntent, confidence)
        """
        q = message.lower().strip()

        # 1. Comparison Intent (e.g. "Compare A021 and A035", "Which is riskier, A021 or A035?")
        direct_codes_in_msg = self.extract_all_asset_codes(message)
        is_explicit_compare = any(w in q for w in ["compare", "vs", "versus", "difference", "riskier", "worse", "side by side", "better"])
        if (len(direct_codes_in_msg) >= 2 and is_explicit_compare) or ("compare" in q and len(all_asset_codes) >= 1) or ("vs" in q and len(all_asset_codes) >= 1):
            return "data", "COMPARE_ASSETS", 0.96
        if len(direct_codes_in_msg) >= 2 and not any(w in q for w in ["why", "how", "what happened", "troubleshoot", "fix", "they", "them", "these", "those"]):
            return "data", "COMPARE_ASSETS", 0.95

        # 2. Conversational Follow-up / Clarification
        followup_questions = [
            "what does that mean", "what does this mean", "what does that imply",
            "can you elaborate", "elaborate", "explain that", "explain more", "tell me more",
            "what did you say", "what was the previous answer", "repeat that", "summarize",
            "can you clarify", "clarify", "more details", "what do you mean"
        ]
        if any(fq in q for fq in followup_questions):
            return "data", "CONVERSATIONAL_FOLLOWUP", 0.95

        # 3. Why are multiple / degraded assets down?
        if any(w in q for w in ["why are they", "why are these", "why are those", "why are they degraded", "why down", "cause of degradation", "why broken"]):
            return "data", "DEGRADED_ASSETS_CAUSES", 0.95

        # 4. Navigation Intent
        is_pure_where = (
            q.startswith("where")
            or q.startswith("how do i see")
            or q.startswith("how can i see")
            or q.startswith("how do i find")
            or q.startswith("how can i find")
            or q.startswith("how do i check")
            or q.startswith("how do i get to")
            or q.startswith("how to navigate")
        )
        is_mixed_question = (
            (" and where " in q)
            or (" and how can i see" in q)
            or (q.startswith("which") and "where" in q)
            or (q.startswith("show") and "where" in q)
        )
        nav_keywords = [
            "where can i see", "where do i find", "where are", "where is", "where can i",
            "how to see", "how do i check", "how to navigate", "show me page", "go to", "open ",
            "download reports", "export reports"
        ]
        has_nav_intent = any(k in q for k in nav_keywords) or is_pure_where

        if is_mixed_question:
            return "mixed", "DATA_AND_NAVIGATION", 0.95

        if has_nav_intent:
            if any(w in q for w in ["prediction", "failure", "probabilit"]):
                return "navigation", "NAV_PREDICTIONS", 0.98
            if any(w in q for w in ["anomal", "sensor", "trend", "hums", "telemetry"]):
                return "navigation", "NAV_TRENDS", 0.98
            if any(w in q for w in ["report", "download", "export", "history", "audit"]):
                return "navigation", "NAV_REPORTS", 0.98
            if any(w in q for w in ["overview", "dashboard", "kpi", "alert"]):
                return "navigation", "NAV_OVERVIEW", 0.95
            if any(w in q for w in ["setting", "config"]):
                return "navigation", "NAV_SETTINGS", 0.95
            return "navigation", "NAV_FLEET", 0.95

        # 5. SentinelAI Conceptual Knowledge (Topic Reset: Do not inject asset data)
        knowledge_keywords = [
            "what is sentinelai", "how does sentinelai work", "what is sentinel",
            "how does failure prediction work", "explain failure probability",
            "what is failure probability", "what does anomaly detection mean",
            "how is asset health calculated", "explain readiness", "4-tier readiness",
            "what ml models", "what models are used", "what does the dashboard show"
        ]
        if any(k in q for k in knowledge_keywords) or (any(w in q for w in ["what is", "how does", "explain"]) and any(t in q for t in ["sentinelai", "model a", "model b", "isolation forest", "readiness tier"])):
            return "knowledge", "PROJECT_KNOWLEDGE", 0.96

        # 6. Troubleshooting & Problem Solving Intent
        troubleshooting_keywords = [
            "troubleshoot", "how to fix", "what should i do", "why is it at risk", "why is this asset at risk",
            "recommended checks", "suggested action", "what action", "what checks", "what to inspect",
            "why is it degraded", "why degraded", "what is wrong", "diagnose", "diagnostic", "troubleshooting",
            "why", "why?", "what caused this", "how do i fix", "how to resolve", "action plan", "fix it"
        ]
        if any(k in q for k in troubleshooting_keywords) or ("why" in q and any(w in q for w in ["risk", "degraded", "grounded", "critical", "fail", "broken", "issue"])):
            if asset_code:
                return "data", "TROUBLESHOOT_ASSET", 0.95
            elif history:
                # If no direct asset but last turn discussed degraded assets, explain causes
                last_turn = history[-1] if history else None
                if last_turn and any(w in last_turn.content.lower() for w in ["degraded", "grounded", "not_ready"]):
                    return "data", "DEGRADED_ASSETS_CAUSES", 0.95

        # 7. Trend & Progression Intent
        trend_keywords = [
            "getting worse", "getting better", "trend", "is it worse", "is that asset degraded",
            "improving", "deteriorating", "what changed", "has failure probability increased",
            "recent trend", "change over time"
        ]
        if any(k in q for k in trend_keywords) and asset_code:
            return "data", "ASSET_TREND", 0.92

        # 8. Specific Asset Inquests (if asset_code identified directly or inherited)
        if asset_code:
            if any(w in q for w in ["sensor", "reading", "temperature", "vibration", "pressure", "voltage", "rpm", "telemetry"]):
                return "data", "ASSET_SENSORS", 0.95
            if any(w in q for w in ["maintenance", "serviced", "repaired", "maintained", "technician", "history", "log"]):
                return "data", "ASSET_MAINTENANCE", 0.95
            if any(w in q for w in ["failure", "probabilit", "breakdown", "critical", "risk", "rul", "remaining useful life"]):
                return "data", "ASSET_FAILURE_RISK", 0.95
            if any(w in q for w in ["trend", "getting worse", "getting better", "improving", "deteriorating"]):
                return "data", "ASSET_TREND", 0.95
            if any(w in q for w in ["status", "state", "ready", "degraded", "health", "how is", "overview", "dossier", "details", "info", "tell me about"]):
                return "data", "ASSET_OVERVIEW", 0.95
            if q in ("why", "why?", "how", "what", "how to fix", "fix", "troubleshoot"):
                return "data", "TROUBLESHOOT_ASSET", 0.95
            return "data", "ASSET_OVERVIEW", 0.90

        # 9. Normalized Synonyms for Problematic / Degraded / Unhealthy Assets
        problem_descriptors = [
            "bad", "problematic", "unhealthy", "broken", "down", "degraded",
            "not ready", "unready", "grounded", "critical", "attention",
            "maintenance", "troubled", "failing", "needs repair", "damaged"
        ]
        asset_nouns = [
            "asset", "assets", "machine", "machines", "unit", "units",
            "platform", "platforms", "vehicle", "vehicles", "one", "ones", "fleet"
        ]
        has_problem = any(p in q for p in problem_descriptors)
        has_noun = any(n in q for n in asset_nouns)

        degraded_exact_phrases = [
            "bad ones", "need attention", "needs attention", "are down", "is down",
            "which need attention", "which are degraded", "what is degraded",
            "assets needing attention", "machines needing attention", "grounded fleet"
        ]

        if (has_problem and has_noun) or any(phrase in q for phrase in degraded_exact_phrases):
            return "data", "DEGRADED_ASSETS", 0.95

        # 10. Highest Failure Probability & Risk Sorting (including short "failure?" or "risk?")
        clean_q = q.strip("?!. ")
        if clean_q in ("failure", "risk", "highest risk", "breakdown", "top risk", "risks", "failure risk") or any(
            w in q for w in ["highest failure", "highest risk", "most critical", "top failure", "most dangerous", "highest breakdown", "failure probability"]
        ):
            return "data", "HIGHEST_FAILURE_RISK", 0.96

        # 11. Threshold Filtering (e.g. "Show assets with failure probability above 70%")
        if any(w in q for w in ["above", "greater than", ">", "exceeding"]) and ("%" in q or "probab" in q or "risk" in q):
            return "data", "FILTER_FAILURE_RISK", 0.94

        # 12. Counts & Readiness
        if any(w in q for w in ["how many ready", "ready assets", "readiness count", "how many are ready", "operational count"]):
            return "data", "READY_COUNTS", 0.95
        if any(w in q for w in ["fleet status", "readiness", "overall status", "how is the fleet"]):
            return "data", "FLEET_STATUS", 0.95

        # 13. Anomalies & Alerts
        if any(w in q for w in ["anomal", "irregular", "deviation", "sensor outlier"]) or clean_q in ("anomalies", "anomaly"):
            return "data", "RECENT_ANOMALIES", 0.95
        if any(w in q for w in ["alert", "alarms", "immediate attention"]):
            return "data", "CRITICAL_ALERTS", 0.95

        # 14. Fleet Inventory
        if any(w in q for w in ["all assets", "show assets", "list assets", "fleet inventory", "all machines", "every asset"]):
            return "data", "ALL_ASSETS_SUMMARY", 0.92

        # 15. Semantic Intelligence Integration for Paraphrases, Informal Queries, and Synonyms
        sem_intent, sem_conf, _ = semantic_understanding_engine.classify_intent_semantic(message, history=history)
        if sem_intent == "FLEET_STATUS":
            if any(w in q for w in ["how many", "count", "number of", "rate"]):
                return "data", "READY_COUNTS", max(sem_conf, 0.95)
            return "data", "FLEET_STATUS", max(sem_conf, 0.95)
        elif sem_intent == "NOT_READY_ASSETS":
            return "data", "DEGRADED_ASSETS", max(sem_conf, 0.95)
        elif sem_intent in ("CRITICAL_ASSETS", "INTERVENTIONS"):
            return "data", "CRITICAL_ALERTS", max(sem_conf, 0.95)
        elif sem_intent in ("FAILURE_RISK", "LOW_RUL"):
            return "data", "HIGHEST_FAILURE_RISK", max(sem_conf, 0.95)
        elif sem_intent == "ANOMALIES":
            return "data", "RECENT_ANOMALIES", max(sem_conf, 0.95)
        elif sem_intent == "ASSET_EXPLANATION" and asset_code:
            return "data", "TROUBLESHOOT_ASSET", max(sem_conf, 0.95)
        elif sem_intent == "ASSET_MAINTENANCE" and asset_code:
            return "data", "ASSET_MAINTENANCE", max(sem_conf, 0.95)
        elif sem_intent == "ASSET_STATUS" and asset_code:
            return "data", "ASSET_OVERVIEW", max(sem_conf, 0.95)

        # 16. Polite Greetings & Introductions
        clean_q = re.sub(r"[^\w\s]", "", q).strip()
        greetings = {"hello", "hi", "hey", "greetings", "good morning", "good afternoon", "good evening", "howdy"}
        if clean_q in greetings or any(clean_q.startswith(g + " ") for g in greetings):
            return "general", "GREETING", 0.98

        # 17. Out-of-Domain & Unrelated queries (jokes, weather, general trivia, casual queries)
        out_of_domain_words = [
            "joke", "jokes", "funny", "laugh", "humor", "riddle",
            "weather", "forecast", "rain", "sunny", "temperature in", "temperature outside",
            "recipe", "recipes", "cook", "bake", "cake", "food", "pizza", "burger", "coffee",
            "movie", "movies", "film", "song", "music", "actor", "actress", "poem", "story", "book",
            "sports", "cricket", "football", "world cup", "match score", "game score",
            "who won", "president of", "prime minister", "capital of", "currency of",
            "write a poem", "write a story", "python code", "solve math", "calculator", "game"
        ]
        if any(w in q for w in out_of_domain_words):
            return "general", "OUT_OF_DOMAIN", 0.99

        if sem_intent == "UNKNOWN":
            return "general", "OUT_OF_DOMAIN", 0.95

        # 18. Default fallback for unmapped non-project questions
        return "general", "OUT_OF_DOMAIN", 0.85

    # ------------------ Controlled Backend Database Operations ------------------

    def _get_asset_overview(self, db: Session, asset_code: str) -> Tuple[Optional[Dict[str, Any]], str, str]:
        """Fetches complete factual status and ML predictions for a specific asset."""
        asset = db.query(Asset).filter(
            (Asset.asset_id.ilike(asset_code)) | (Asset.asset_name.ilike(f"%{asset_code}%"))
        ).first()

        if not asset:
            msg = (
                f"### 🔍 Asset Not Found\n\n"
                f"I couldn't find Asset **{asset_code}** in the SentinelAI database.\n\n"
                f"**You can try:**\n"
                f"- Checking the asset identifier (e.g. `A001` through `A050`)\n"
                f"- Asking me to **\"Show all assets\"** to browse the fleet\n"
                f"- Opening the Fleet Assets page to inspect all monitored platforms"
            )
            return None, msg, "NOT_FOUND"

        # Latest status record
        st = db.query(AssetStatus).filter(
            AssetStatus.asset_id == asset.asset_id
        ).order_by(AssetStatus.calculated_at.desc()).first()

        # Latest component predictions
        predictions = db.execute(text("""
            SELECT DISTINCT ON (p.component_id)
                p.component_id, p.component_type, p.failure_probability, p.health_score,
                p.maintenance_priority, p.priority_level, p.primary_reason
            FROM predictions p
            WHERE p.asset_id = :aid
            ORDER BY p.component_id, p.timestamp DESC;
        """), {"aid": asset.asset_id}).fetchall()

        status_str = st.status if st else "READY"
        highest_risk = max(predictions, key=lambda p: float(p[2] or 0.0)) if predictions else None

        data_payload = {
            "asset_id": asset.asset_id,
            "asset_name": asset.asset_name or f"Tactical Asset {asset.asset_id}",
            "asset_type": asset.asset_type or "Ground Vehicle",
            "status": status_str,
            "components_count": len(predictions),
            "max_failure_probability": float(highest_risk[2]) if highest_risk else 0.0,
            "min_health_score": float(highest_risk[3]) if highest_risk else 100.0,
            "priority_level": highest_risk[5] if highest_risk else "LOW",
            "primary_driver": highest_risk[6] if highest_risk else "Nominal operation",
            "target_component": highest_risk[1] if highest_risk else "General",
        }

        # Format clean markdown
        md = [
            f"## Asset {asset.asset_id} Overview\n",
            f"- **Platform Name:** {data_payload['asset_name']} ({data_payload['asset_type']})",
            f"- **Operational Status:** `{status_str}`",
            f"- **Monitored Subsystems:** {len(predictions)} active components",
        ]

        if highest_risk:
            md.extend([
                f"- **Highest Failure Probability:** **{highest_risk[2]:.1f}%** ({highest_risk[0]} — {highest_risk[1]})",
                f"- **Health Score:** {highest_risk[3]:.1f}%",
                f"- **Maintenance Urgency:** `{highest_risk[5]}` (Priority: {highest_risk[4]:.1f}/100)",
                f"- **Primary Telemetry Driver:** {highest_risk[6]}",
            ])
            if status_str in ("NOT_READY", "DEGRADED") or float(highest_risk[2]) >= 50.0:
                md.append(f"\n> ⚠️ **Alert:** Asset {asset.asset_id} shows elevated component risk. Ask *\"Troubleshoot {asset.asset_id}\"* for actionable diagnostic check steps.")
        else:
            md.append("\n> ✅ Telemetry nominal. All subsystems operating within baseline tolerances.")

        return data_payload, "\n".join(md), "FOUND"

    def _troubleshoot_asset(self, db: Session, asset_code: str) -> Tuple[Optional[Dict[str, Any]], str, str]:
        """Compiles real telemetry, anomalies, and predictions to generate actionable troubleshooting steps."""
        asset = db.query(Asset).filter(
            (Asset.asset_id.ilike(asset_code)) | (Asset.asset_name.ilike(f"%{asset_code}%"))
        ).first()

        if not asset:
            msg = f"I couldn't find Asset **{asset_code}** in the SentinelAI database to troubleshoot."
            return None, msg, "NOT_FOUND"

        # 1. Fetch latest status
        st = db.query(AssetStatus).filter(
            AssetStatus.asset_id == asset.asset_id
        ).order_by(AssetStatus.calculated_at.desc()).first()
        status_str = st.status if st else "READY"

        # 2. Fetch latest predictions
        preds = db.execute(text("""
            SELECT DISTINCT ON (p.component_id)
                p.component_id, p.component_type, p.failure_probability, p.health_score,
                p.maintenance_priority, p.priority_level, p.primary_reason
            FROM predictions p
            WHERE p.asset_id = :aid
            ORDER BY p.component_id, p.timestamp DESC;
        """), {"aid": asset.asset_id}).fetchall()

        highest = max(preds, key=lambda p: float(p[2] or 0.0)) if preds else None
        fail_prob = float(highest[2]) if highest else 10.0
        health = float(highest[3]) if highest else 90.0
        comp_type = highest[1] if highest else "Engine"
        primary_reason = highest[6] if highest else "Nominal operation"

        # 3. Fetch latest sensors
        sensors = db.query(SensorReading).filter(
            SensorReading.asset_id == asset.asset_id
        ).order_by(SensorReading.timestamp.desc()).first()

        sensor_dict = {}
        if sensors:
            sensor_dict = {
                "temperature": sensors.temperature,
                "vibration": sensors.vibration,
                "oilPressure": sensors.oil_pressure,
                "fuelPressure": sensors.fuel_pressure,
                "hydraulicPressure": sensors.hydraulic_pressure,
                "batteryVoltage": sensors.battery_voltage,
                "rpm": sensors.rpm,
            }

        # 4. Fetch recent anomalies
        anom_records = db.query(Anomaly).filter(Anomaly.asset_id == asset.id).order_by(Anomaly.detected_at.desc()).limit(3).all()
        anom_list = [{"sensor": a.affected_sensor, "severity": a.severity, "score": a.anomaly_score} for a in anom_records]

        # 5. Generate structured troubleshooting via engine
        tb_data = troubleshooting_engine.generate_asset_troubleshooting(
            asset_id=asset.asset_id,
            status=status_str,
            health_score=health,
            failure_prob=fail_prob,
            highest_component=comp_type,
            primary_reason=primary_reason,
            anomalies=anom_list,
            sensor_readings=sensor_dict,
        )

        md = troubleshooting_engine.format_troubleshooting_markdown(tb_data)
        return tb_data, md, "FOUND"

    def _compare_assets(self, db: Session, code1: str, code2: str) -> Tuple[Optional[Dict[str, Any]], str, str]:
        """Performs side-by-side comparison between two assets from real Neon DB data."""
        data1, _, status1 = self._get_asset_overview(db, code1)
        data2, _, status2 = self._get_asset_overview(db, code2)

        if status1 == "NOT_FOUND" and status2 == "NOT_FOUND":
            return None, f"Neither Asset **{code1}** nor Asset **{code2}** was found in the SentinelAI database.", "NOT_FOUND"
        if status1 == "NOT_FOUND":
            return None, f"Asset **{code1}** was not found in the database (Asset **{code2}** is available).", "NOT_FOUND"
        if status2 == "NOT_FOUND":
            return None, f"Asset **{code2}** was not found in the database (Asset **{code1}** is available).", "NOT_FOUND"

        # Both found — construct comparison table
        status_comp = "Identical posture" if data1["status"] == data2["status"] else f"{code1} is {data1['status']}"
        risk_comp = f"{code1} has higher risk" if data1["max_failure_probability"] > data2["max_failure_probability"] else f"{code2} has higher risk"
        health_comp = f"{code1} is healthier" if data1["min_health_score"] > data2["min_health_score"] else f"{code2} is healthier"

        md = [
            f"## ⚖️ Tactical Asset Comparison: {code1} vs {code2}\n",
            f"| Metric | Asset {code1} | Asset {code2} | Comparison |",
            f"| :--- | :---: | :---: | :--- |",
            f"| **Operational Status** | `{data1['status']}` | `{data2['status']}` | {status_comp} |",
            f"| **50-Hour Failure Risk** | **{data1['max_failure_probability']:.1f}%** | **{data2['max_failure_probability']:.1f}%** | {risk_comp} |",
            f"| **Health Score** | {data1['min_health_score']:.1f}% | {data2['min_health_score']:.1f}% | {health_comp} |",
            f"| **Primary Subsystem Risk** | `{data1['target_component']}` | `{data2['target_component']}` | — |",
            f"| **Maintenance Priority** | `{data1['priority_level']}` | `{data2['priority_level']}` | — |",
        ]

        worse_asset = code1 if data1["max_failure_probability"] >= data2["max_failure_probability"] else code2
        better_asset = code2 if worse_asset == code1 else code1

        md.append(f"\n### 🎯 Factual Summary")
        md.append(f"- **Higher Risk Asset:** **{worse_asset}** with {max(data1['max_failure_probability'], data2['max_failure_probability']):.1f}% breakdown probability.")
        md.append(f"- **Recommended Priority:** Allocate maintenance inspection to **{worse_asset}** before scheduling mission sorties.")

        comparison_data = {"asset1": data1, "asset2": data2, "worseAsset": worse_asset, "betterAsset": better_asset}
        return comparison_data, "\n".join(md), "FOUND"

    def _get_asset_trend(self, db: Session, asset_code: str) -> Tuple[Optional[Dict[str, Any]], str, str]:
        """Checks multi-timestamp progression for an asset to evaluate trends honestly."""
        asset = db.query(Asset).filter(
            (Asset.asset_id.ilike(asset_code)) | (Asset.asset_name.ilike(f"%{asset_code}%"))
        ).first()

        if not asset:
            return None, f"I couldn't find Asset **{asset_code}** in the SentinelAI database to evaluate trends.", "NOT_FOUND"

        # Check historical statuses
        history_statuses = db.query(AssetStatus).filter(
            AssetStatus.asset_id == asset.asset_id
        ).order_by(AssetStatus.calculated_at.desc()).limit(5).all()

        if len(history_statuses) < 2:
            md = (
                f"## 📈 Telemetry Trend Assessment: Asset {asset.asset_id}\n\n"
                f"- **Current Status:** `{history_statuses[0].status if history_statuses else 'READY'}`\n\n"
                f"> ℹ️ **Notice:** Only 1 historical assessment record exists for Asset {asset.asset_id} in the database. "
                f"I don't have enough historical assessment records to compute a mathematical progression trend. "
                f"Telemetry readings are currently stable within active sensor bounds."
            )
            return {"historyCount": len(history_statuses)}, md, "FOUND"

        latest = history_statuses[0]
        prev = history_statuses[1]
        md = [
            f"## 📈 Historical Assessment Trend: Asset {asset.asset_id}\n",
            f"- **Current Posture:** `{latest.status}`",
            f"- **Previous Posture:** `{prev.status}`",
            f"- **Logged Evaluations:** {len(history_statuses)} assessment checkpoints recorded in database.",
        ]

        if latest.status == prev.status:
            md.append("\n> **Trend:** Operational state is **stable** with no recent tier degradation.")
        elif latest.status in ("DEGRADED", "NOT_READY") and prev.status in ("READY", "CAUTION"):
            md.append("\n> ⚠️ **Trend:** Operational posture has **deteriorated** since the previous assessment cycle.")
        else:
            md.append("\n> ✅ **Trend:** Operational posture has **improved** following servicing.")

        return {"historyCount": len(history_statuses), "latest": latest.status, "previous": prev.status}, "\n".join(md), "FOUND"

    def _get_highest_failure_risk(self, db: Session, limit: int = 5) -> Tuple[Dict[str, Any], str, str]:
        """Retrieves components with highest failure probability from predictions."""
        rows = db.execute(text("""
            SELECT * FROM (
                SELECT DISTINCT ON (p.component_id)
                    p.component_id, p.asset_id, p.component_type, p.failure_probability,
                    p.health_score, p.maintenance_priority, p.priority_level, p.primary_reason
                FROM predictions p
                ORDER BY p.component_id, p.timestamp DESC
            ) latest
            ORDER BY latest.failure_probability DESC
            LIMIT :lim;
        """), {"lim": limit}).fetchall()

        if not rows:
            return {"assets": []}, "No failure prediction records were found in the database.", "EMPTY_RESULT"

        assets_list = [
            {
                "componentId": r[0],
                "assetId": r[1],
                "componentType": r[2],
                "failureProbability": float(r[3] or 0.0),
                "healthScore": float(r[4] or 0.0),
                "priorityLevel": r[6],
                "primaryReason": r[7]
            }
            for r in rows
        ]

        top = assets_list[0]
        md = [
            f"## 🚨 Highest Failure Probability Assets\n",
            f"The asset with the highest predicted breakdown probability is **{top['assetId']}** (Subsystem: `{top['componentId']}`) with a **{top['failureProbability']:.1f}%** failure likelihood within 50 operating hours.\n",
            "| Asset ID | Component | Subsystem | Failure Prob | Health | Priority |",
            "| :--- | :--- | :--- | :---: | :---: | :--- |"
        ]

        for a in assets_list:
            md.append(
                f"| **{a['assetId']}** | `{a['componentId']}` | {a['componentType']} | **{a['failureProbability']:.1f}%** | {a['healthScore']:.0f}% | `{a['priorityLevel']}` |"
            )

        md.append(f"\n**Primary Risk Driver for {top['assetId']}:** {top['primaryReason']}")
        md.append(f"\n*Tip:* Ask *\"Troubleshoot {top['assetId']}\"* for component-specific diagnostic steps.")

        return {"assets": assets_list}, "\n".join(md), "FOUND"

    def _get_degraded_assets(self, db: Session) -> Tuple[Dict[str, Any], str, str]:
        """Retrieves assets currently marked DEGRADED or NOT_READY."""
        rows = db.execute(text("""
            SELECT DISTINCT ON (s.asset_id)
                s.asset_id, s.status, s.critical_component_count, s.high_priority_component_count,
                s.anomalous_component_count, a.asset_name, a.asset_type
            FROM asset_status s
            JOIN assets a ON s.asset_id = a.asset_id
            WHERE s.status IN ('NOT_READY', 'DEGRADED')
            ORDER BY s.asset_id, s.calculated_at DESC;
        """)).fetchall()

        assets_list = [
            {
                "id": r[0],
                "status": r[1],
                "criticalComponents": r[2],
                "highPriorityComponents": r[3],
                "anomalousComponents": r[4],
                "name": r[5] or f"Tactical Asset {r[0]}",
                "type": r[6] or "Ground Vehicle"
            }
            for r in rows
        ]

        if not assets_list:
            return {"assets": []}, "Good news: There are currently **0** degraded or grounded assets across the active fleet.", "EMPTY_RESULT"

        md = [
            f"## ⚠️ Problematic & Degraded Fleet Assets\n",
            f"Identified **{len(assets_list)} assets** requiring attention or grounded from combat readiness:\n",
            "| Asset ID | Platform Name | Status | Critical Subsystems | Anomalies |",
            "| :--- | :--- | :---: | :---: | :---: |"
        ]

        for a in assets_list:
            md.append(f"| **{a['id']}** | {a['name']} | `{a['status']}` | {a['criticalComponents']} | {a['anomalousComponents']} |")

        md.append(f"\n**Total Impacted Platforms:** {len(assets_list)}")
        md.append("These platforms should not be cleared for operational sorties until diagnostic procedures verify component clearance.")

        return {"assets": assets_list, "count": len(assets_list)}, "\n".join(md), "FOUND"

    def _get_degraded_assets_causes(self, db: Session, asset_ids: Optional[List[str]] = None) -> Tuple[Dict[str, Any], str, str]:
        """Provides root causes, failing subsystems, and telemetry correlations for degraded platforms."""
        if not asset_ids:
            degraded_rows = db.execute(text("""
                SELECT DISTINCT ON (s.asset_id) s.asset_id
                FROM asset_status s
                WHERE s.status IN ('NOT_READY', 'DEGRADED')
                ORDER BY s.asset_id, s.calculated_at DESC;
            """)).fetchall()
            asset_ids = [r[0] for r in degraded_rows]

        if not asset_ids:
            return {"assets": []}, "All fleet assets are currently operating within nominal parameters with no active degradation.", "FOUND"

        pred_rows = db.execute(text("""
            SELECT p.asset_id, p.component_type, p.failure_probability, p.health_score,
                   p.priority_level, p.primary_reason, a.asset_name
            FROM predictions p
            JOIN assets a ON p.asset_id = a.asset_id
            WHERE p.asset_id = ANY(:aids)
            ORDER BY p.asset_id, p.failure_probability DESC;
        """), {"aids": asset_ids}).fetchall()

        seen_assets = set()
        causes_list = []
        md = [
            "## 🔍 Degradation Root Cause Analysis\n",
            f"Here is the detailed breakdown of why these **{len(asset_ids)} platforms** are degraded or restricted:\n",
            "| Asset ID | Platform | Failing Subsystem | Failure Risk | Health | Primary Reason |",
            "| :--- | :--- | :--- | :---: | :---: | :--- |"
        ]

        for r in pred_rows:
            aid, comp, f_prob, health, prio, reason, name = r
            if aid in seen_assets:
                continue
            seen_assets.add(aid)
            f_val = float(f_prob or 0.0)
            h_val = float(health or 0.0)
            causes_list.append({
                "id": aid,
                "name": name or f"Asset {aid}",
                "component": comp,
                "failureProbability": f_val,
                "healthScore": h_val,
                "reason": reason
            })
            md.append(f"| **{aid}** | {name or aid} | `{comp}` | **{f_val:.1f}%** | {h_val:.0f}% | {reason} |")

        md.append("\n### 🛠️ Operational Recommendations:")
        md.append("- **Direct Action:** Restrict operational deployment until depot mechanics inspect the flagged subsystems.")
        md.append("- **Troubleshooting:** Ask *\"Troubleshoot <Asset ID>\"* (e.g. `Troubleshoot A035`) for step-by-step diagnostic procedures.")

        return {"causes": causes_list}, "\n".join(md), "FOUND"

    def _handle_conversational_followup(
        self,
        db: Session,
        message: str,
        history: List[ChatMessage],
        primary_asset_code: Optional[str]
    ) -> Tuple[Optional[Dict[str, Any]], str, str]:
        """
        Handles natural language conversational follow-ups (e.g. 'What does that mean?',
        'Can you elaborate?', 'Tell me more', 'What did you say?', 'Why is that?').
        """
        q_lower = message.lower().strip()
        last_assistant_msg = ""
        last_user_msg = ""
        for turn in reversed(history):
            if not last_assistant_msg and turn.role == "assistant":
                last_assistant_msg = turn.content
            elif not last_user_msg and turn.role == "user":
                last_user_msg = turn.content

        # Case 1: If an asset was active, give a deep-dive breakdown of that asset
        if primary_asset_code:
            payload, overview_md, status = self._get_asset_overview(db, primary_asset_code)
            if payload:
                md = [
                    f"## 📋 In-Depth Elaboration on Platform **{primary_asset_code}**\n",
                    f"Regarding our discussion on **{primary_asset_code}** ({payload.get('name', 'Tactical Asset')}):\n",
                    f"- **Operational Status:** `{payload.get('status', 'ACTIVE')}`",
                    f"- **Overall Health Score:** **{payload.get('healthScore', 0):.0f}%**",
                    f"- **Critical Subsystems:** {payload.get('criticalComponents', 0)} flagged",
                ]
                if payload.get("predictions") and len(payload["predictions"]) > 0:
                    top_pred = payload["predictions"][0]
                    md.append(f"- **Primary Breakdown Risk:** `{top_pred['componentId']}` ({top_pred['componentType']}) with **{top_pred['failureProbability']:.1f}%** failure likelihood within 50 hours.")
                    md.append(f"- **Causal Telemetry:** {top_pred['primaryReason']}")
                md.append("\n### 💡 What This Means Operationally:")
                md.append(f"Asset **{primary_asset_code}** has telemetry deviations indicating accelerated component wear. "
                          f"Operating under combat sorties in this state risks catastrophic subsystem failure.")
                md.append(f"\n*Tip:* Ask *\"Troubleshoot {primary_asset_code}\"* for diagnostic check procedures or *\"Show {primary_asset_code} sensor readings\"* to examine live sensor data.")
                return payload, "\n".join(md), "FOUND"

        # Case 2: Summarizing or repeating previous discussion
        if any(w in q_lower for w in ["what did you say", "repeat", "summarize", "recap"]):
            if last_assistant_msg:
                snippet = last_assistant_msg[:400].strip()
                summary_md = (
                    f"## 📝 Recap of Previous Answer\n\n"
                    f"In response to your inquiry *\"{last_user_msg}\"*, we reviewed:\n\n"
                    f"{snippet}...\n\n"
                    "Would you like me to drill into specific telemetry readings, run troubleshooting, or inspect another platform?"
                )
                return None, summary_md, "FOUND"

        # Case 3: Explaining readiness / scores in general
        if any(w in q_lower for w in ["what does that mean", "what does this mean", "explain that", "explain more", "why", "elaborate"]):
            if last_assistant_msg:
                return None, (
                    f"## 💡 Operational Interpretation\n\n"
                    f"Regarding our discussion on *\"{last_user_msg}\"*:\n\n"
                    f"- **Health Scores & Readiness:** In SentinelAI, health scores below 60% transition platforms into restricted (DEGRADED) status, while scores below 40% ground the vehicle (NOT_READY) to prevent catastrophic mechanical failure.\n"
                    f"- **Prognostic Window:** Predictions reflect mathematical probabilities over the next **50 operating hours** based on multi-sensor vibration, temperature, and hydraulic pressure deviations.\n"
                    f"- **Recommended Next Step:** Schedule depot inspection for the affected subsystems or ask me to **Troubleshoot** a specific asset."
                ), "FOUND"

        # Fallback to readiness counts
        return self._get_readiness_counts(db)

    def _filter_failure_risk(self, db: Session, threshold: float = 70.0) -> Tuple[Dict[str, Any], str, str]:
        """Retrieves assets and components with failure probability above given threshold."""
        rows = db.execute(text("""
            SELECT * FROM (
                SELECT DISTINCT ON (p.component_id)
                    p.component_id, p.asset_id, p.component_type, p.failure_probability,
                    p.health_score, p.priority_level, p.primary_reason
                FROM predictions p
                ORDER BY p.component_id, p.timestamp DESC
            ) latest
            WHERE latest.failure_probability >= :thresh
            ORDER BY latest.failure_probability DESC;
        """), {"thresh": threshold}).fetchall()

        assets_list = [
            {
                "componentId": r[0],
                "assetId": r[1],
                "componentType": r[2],
                "failureProbability": float(r[3] or 0.0),
                "healthScore": float(r[4] or 0.0),
                "priorityLevel": r[5],
                "primaryReason": r[6]
            }
            for r in rows
        ]

        if not assets_list:
            return {"assets": []}, f"No components or assets currently exceed the **{threshold}%** failure probability threshold.", "EMPTY_RESULT"

        md = [
            f"## 🛡️ High-Risk Assets (Failure Probability ≥ {threshold}%)\n",
            f"Found **{len(assets_list)} components** exceeding the {threshold}% failure threshold:\n",
            "| Asset | Component | Subsystem Type | Failure Prob | Health | Priority |",
            "| :--- | :--- | :--- | :---: | :---: | :--- |"
        ]

        for a in assets_list:
            md.append(f"| **{a['assetId']}** | `{a['componentId']}` | {a['componentType']} | **{a['failureProbability']:.1f}%** | {a['healthScore']:.0f}% | `{a['priorityLevel']}` |")

        md.append(f"\n**Total High-Risk Components:** {len(assets_list)}")

        return {"assets": assets_list, "count": len(assets_list)}, "\n".join(md), "FOUND"

    def _get_readiness_counts(self, db: Session) -> Tuple[Dict[str, Any], str, str]:
        """Returns distribution counts across READY, ATTENTION, NOT_READY, DEGRADED."""
        total_assets = db.query(Asset).count()
        latest_status = db.execute(text("""
            SELECT DISTINCT ON (s.asset_id)
                s.asset_id, s.status
            FROM asset_status s
            ORDER BY s.asset_id, s.calculated_at DESC;
        """)).fetchall()

        ready_count = sum(1 for s in latest_status if s[1] == "READY")
        attention_count = sum(1 for s in latest_status if s[1] == "ATTENTION")
        not_ready_count = sum(1 for s in latest_status if s[1] == "NOT_READY")
        degraded_count = sum(1 for s in latest_status if s[1] == "DEGRADED")
        readiness_pct = (ready_count / total_assets * 100.0) if total_assets > 0 else 100.0

        data = {
            "totalAssets": total_assets,
            "ready": ready_count,
            "attention": attention_count,
            "notReady": not_ready_count,
            "degraded": degraded_count,
            "readinessPercentage": round(readiness_pct, 1)
        }

        md = (
            f"## 📊 Fleet Readiness Summary\n\n"
            f"- **Total Monitored Platforms:** {total_assets}\n"
            f"- **Mission-Ready Assets:** **{ready_count}** ({readiness_pct:.1f}% readiness rate)\n"
            f"- **Attention Required:** {attention_count}\n"
            f"- **Degraded / Restricted:** {degraded_count}\n"
            f"- **Not Ready / Grounded:** {not_ready_count}\n\n"
            f"> The fleet is currently operating at **{readiness_pct:.1f}%** operational capacity."
        )

        return data, md, "FOUND"

    def _get_all_assets_summary(self, db: Session, limit: int = 10) -> Tuple[Dict[str, Any], str, str]:
        """Lists assets with their latest known status."""
        total = db.query(Asset).count()
        assets = db.execute(text("""
            SELECT a.asset_id, a.asset_name, a.asset_type, COALESCE(latest.status, 'READY') as status
            FROM assets a
            LEFT JOIN (
                SELECT DISTINCT ON (s.asset_id) s.asset_id, s.status
                FROM asset_status s
                ORDER BY s.asset_id, s.calculated_at DESC
            ) latest ON a.asset_id = latest.asset_id
            ORDER BY a.asset_id ASC
            LIMIT :lim;
        """), {"lim": limit}).fetchall()

        asset_list = [{"id": r[0], "name": r[1], "type": r[2], "status": r[3]} for r in assets]

        md = [
            f"## 📋 Fleet Asset Inventory (Showing {len(asset_list)} of {total} Platforms)\n",
            "| Asset ID | Platform Name | Type | Status |",
            "| :--- | :--- | :--- | :---: |"
        ]
        for a in asset_list:
            md.append(f"| **{a['id']}** | {a['name'] or 'Tactical Unit'} | {a['type'] or 'Ground Vehicle'} | `{a['status']}` |")

        md.append(f"\n*Use 'Tell me about [Asset ID]' (e.g. A021) for full diagnostics.*")

        return {"total": total, "assets": asset_list}, "\n".join(md), "FOUND"

    def _get_recent_anomalies(self, db: Session, limit: int = 5) -> Tuple[Dict[str, Any], str, str]:
        """Fetches latest telemetry anomalies."""
        anomalies = db.query(Anomaly).order_by(Anomaly.detected_at.desc()).limit(limit).all()

        if not anomalies:
            return {"anomalies": []}, "No abnormal sensor deviations or anomalies are currently logged in the database.", "EMPTY_RESULT"

        res = []
        md = [
            f"## 🔍 Recent Telemetry Anomalies (Last {len(anomalies)})\n",
            "| Asset ID | Sensor Channel | Score | Severity | Detected At |",
            "| :---: | :--- | :---: | :---: | :--- |"
        ]

        for an in anomalies:
            ast = db.query(Asset).filter(Asset.id == an.asset_id).first()
            aid = ast.asset_id if ast else f"#{an.asset_id}"
            dt_str = an.detected_at.strftime("%Y-%m-%d %H:%M UTC") if an.detected_at else "N/A"
            res.append({
                "assetId": aid,
                "sensor": an.affected_sensor or "Multi-Channel",
                "score": round(an.anomaly_score, 2),
                "severity": an.severity,
                "detectedAt": dt_str
            })
            md.append(f"| **{aid}** | {an.affected_sensor or 'Multi-channel'} | {an.anomaly_score:.2f} | `{an.severity}` | {dt_str} |")

        return {"anomalies": res}, "\n".join(md), "FOUND"

    def _get_critical_alerts(self, db: Session, limit: int = 5) -> Tuple[Dict[str, Any], str, str]:
        """Fetches critical component predictions and alerts."""
        rows = db.execute(text("""
            SELECT * FROM (
                SELECT DISTINCT ON (p.component_id)
                    p.component_id, p.asset_id, p.component_type, p.failure_probability,
                    p.health_score, p.maintenance_priority, p.priority_level, p.primary_reason
                FROM predictions p
                ORDER BY p.component_id, p.timestamp DESC
            ) latest
            WHERE latest.priority_level = 'CRITICAL' OR latest.maintenance_priority >= 80.0
            ORDER BY latest.maintenance_priority DESC
            LIMIT :lim;
        """), {"lim": limit}).fetchall()

        if not rows:
            return {"alerts": []}, "No active critical alerts or urgent priority maintenance actions are logged.", "EMPTY_RESULT"

        alerts = [
            {
                "componentId": r[0],
                "assetId": r[1],
                "componentType": r[2],
                "failureProb": float(r[3] or 0.0),
                "health": float(r[4] or 0.0),
                "priority": float(r[5] or 0.0),
                "level": r[6],
                "reason": r[7]
            }
            for r in rows
        ]

        md = [
            f"## 🚨 Critical Operational Alerts\n",
            f"There are **{len(alerts)} critical-priority alerts** requiring immediate attention:\n",
            "| Asset | Component | Subsystem | Urgency | Primary Reason |",
            "| :--- | :--- | :--- | :---: | :--- |"
        ]

        for a in alerts:
            md.append(f"| **{a['assetId']}** | `{a['componentId']}` | {a['componentType']} | `{a['level']}` | {a['reason']} |")

        return {"alerts": alerts}, "\n".join(md), "FOUND"

    def _get_asset_sensors(self, db: Session, asset_code: str) -> Tuple[Optional[Dict[str, Any]], str, str]:
        """Fetches latest sensor readings for a specific asset."""
        asset = db.query(Asset).filter(
            (Asset.asset_id.ilike(asset_code)) | (Asset.asset_name.ilike(f"%{asset_code}%"))
        ).first()

        if not asset:
            return None, f"Asset **{asset_code}** was not found in the SentinelAI fleet database.", "NOT_FOUND"

        readings = db.query(SensorReading).filter(
            SensorReading.asset_id == asset.asset_id
        ).order_by(SensorReading.timestamp.desc()).limit(1).all()

        if not readings:
            return None, f"No recent telemetry readings found for Asset **{asset.asset_id}**.", "EMPTY_RESULT"

        r = readings[0]
        ts_str = r.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC") if r.timestamp else "Real-time"
        data = {
            "assetId": asset.asset_id,
            "timestamp": ts_str,
            "temperature": r.temperature,
            "vibration": r.vibration,
            "oilPressure": r.oil_pressure,
            "fuelPressure": r.fuel_pressure,
            "hydraulicPressure": r.hydraulic_pressure,
            "rpm": r.rpm,
            "batteryVoltage": r.battery_voltage,
            "operatingHours": r.operating_hours,
        }

        md = [
            f"## 📡 Latest Telemetry Readings for Asset {asset.asset_id}\n",
            f"*Captured: {ts_str}*\n",
            "| Telemetry Channel | Value | Nominal Range |",
            "| :--- | :---: | :---: |",
            f"| **Temperature** | {f'{r.temperature:.1f} °C' if r.temperature is not None else 'N/A'} | 70–95 °C |",
            f"| **Vibration** | {f'{r.vibration:.3f} g' if r.vibration is not None else 'N/A'} | < 0.45 g |",
            f"| **Oil Pressure** | {f'{r.oil_pressure:.1f} PSI' if r.oil_pressure is not None else 'N/A'} | 45–65 PSI |",
            f"| **Fuel Pressure** | {f'{r.fuel_pressure:.1f} PSI' if r.fuel_pressure is not None else 'N/A'} | 35–50 PSI |",
            f"| **Hydraulic Pressure** | {f'{r.hydraulic_pressure:.1f} PSI' if r.hydraulic_pressure is not None else 'N/A'} | 2800–3200 PSI |",
            f"| **Engine RPM** | {f'{r.rpm:.0f}' if r.rpm is not None else 'N/A'} | 1800–2400 |",
            f"| **Battery Bus Voltage** | {f'{r.battery_voltage:.1f} V' if r.battery_voltage is not None else 'N/A'} | 24–28 V |",
            f"| **Operating Hours** | {f'{r.operating_hours:.1f} hrs' if r.operating_hours is not None else 'N/A'} | Cycle Target |",
        ]

        return data, "\n".join(md), "FOUND"

    def _get_asset_maintenance(self, db: Session, asset_code: str) -> Tuple[Optional[Dict[str, Any]], str, str]:
        """Fetches maintenance records for a specific asset."""
        asset = db.query(Asset).filter(
            (Asset.asset_id.ilike(asset_code)) | (Asset.asset_name.ilike(f"%{asset_code}%"))
        ).first()

        if not asset:
            return None, f"Asset **{asset_code}** was not found in the SentinelAI fleet database.", "NOT_FOUND"

        records = db.query(MaintenanceRecord).filter(
            MaintenanceRecord.asset_id == asset.id
        ).order_by(MaintenanceRecord.maintenance_date.desc()).limit(3).all()

        if not records:
            return {"records": []}, f"No historical maintenance records found for Asset **{asset.asset_id}** in the database.", "EMPTY_RESULT"

        rec_list = []
        md = [
            f"## 🔧 Maintenance History for Asset {asset.asset_id}\n",
            "| Date | Type | Subsystem | Issue Detected | Status |",
            "| :--- | :--- | :--- | :--- | :---: |"
        ]

        for m in records:
            d_str = m.maintenance_date.strftime("%Y-%m-%d") if m.maintenance_date else "N/A"
            rec_list.append({
                "date": d_str,
                "type": m.maintenance_type,
                "component": m.component or m.component_id or "Platform",
                "issue": m.issue_detected or "Scheduled servicing",
                "status": m.maintenance_status
            })
            md.append(f"| {d_str} | {m.maintenance_type} | {m.component or m.component_id or 'General'} | {m.issue_detected or 'Scheduled overhaul'} | `{m.maintenance_status}` |")

        return {"records": rec_list}, "\n".join(md), "FOUND"

    # ------------------ Dynamic Suggestion Generator ------------------

    def _generate_dynamic_suggestions(
        self,
        intent: str,
        asset_code: Optional[str] = None,
        data_payload: Optional[Dict[str, Any]] = None,
    ) -> List[str]:
        """Generates context-aware follow-up suggestion chips."""
        if asset_code:
            return [
                f"Why is {asset_code} at risk?",
                f"Troubleshoot {asset_code}",
                f"Show {asset_code} sensor readings",
                f"Compare {asset_code} with A035",
            ]

        if intent == "DEGRADED_ASSETS_CAUSES":
            return [
                "Troubleshoot the first one",
                "Show degraded assets",
                "Where can I see predictions?",
                "Fleet readiness summary",
            ]

        if intent == "CONVERSATIONAL_FOLLOWUP":
            if asset_code:
                return [
                    f"Troubleshoot {asset_code}",
                    f"Show {asset_code} sensor readings",
                    f"Why is {asset_code} at risk?",
                    "Fleet readiness summary",
                ]
            return [
                "Which assets are degraded?",
                "Which asset has the highest failure probability?",
                "Show recent anomalies",
                "Where can I download reports?",
            ]

        if intent in ("DEGRADED_ASSETS", "HIGHEST_FAILURE_RISK", "FILTER_FAILURE_RISK"):
            # Check if assets are in payload
            if data_payload and data_payload.get("assets") and len(data_payload["assets"]) > 0:
                top_id = data_payload["assets"][0].get("id") or data_payload["assets"][0].get("assetId")
                return [
                    f"Tell me about {top_id}",
                    f"Troubleshoot {top_id}",
                    "Where can I see predictions?",
                    "Show recent anomalies",
                ]
            return [
                "Which asset has the highest failure probability?",
                "Show recent anomalies",
                "Where can I see predictions?",
            ]

        if intent == "RECENT_ANOMALIES":
            return [
                "Which assets are degraded?",
                "Where can I see anomalies?",
                "Show critical alerts",
            ]

        if intent == "NAV_PREDICTIONS":
            return [
                "Which asset has the highest failure probability?",
                "Show assets with failure probability above 70%",
                "Where can I download reports?",
            ]

        if intent == "PROJECT_KNOWLEDGE":
            return [
                "How does failure prediction work?",
                "Show degraded assets",
                "Which asset has highest failure risk?",
            ]

        if intent in ("OUT_OF_DOMAIN", "UNKNOWN"):
            return [
                "What is our current fleet readiness?",
                "Which assets are NOT mission-ready?",
                "Why is asset A021 down?",
                "Show recent sensor anomalies",
            ]

        if intent == "GREETING":
            return [
                "What is our current fleet readiness?",
                "Which assets are degraded?",
                "Which asset has highest failure risk?",
                "Where can I see predictions?",
            ]

        # Default initial / general suggestions
        return [
            "Which assets are degraded?",
            "Which asset has the highest failure probability?",
            "Show recent anomalies",
            "Where can I download reports?",
        ]

    # ------------------ Main Processing Pipeline ------------------

    def process_chat(self, db: Session, request: ChatRequest) -> ChatResponse:
        """Processes a chat request end-to-end with intent understanding, Neon DB, and IBM Bob."""
        message = (request.message or "").strip()
        req_id = request.requestId

        if not message:
            return ChatResponse(
                success=False,
                message="Please provide a message or inquiry.",
                responseType="error",
                resultStatus="INVALID_ENTITY",
                data=None,
                navigation=None,
                sources=[],
                requestId=req_id
            )

        # 1. Resolve asset entities across conversation context
        primary_asset_code, all_asset_codes = self.resolve_asset_entities(message, request.history)

        # 2. Classify intent with conversation history awareness
        response_type, sub_intent, confidence = self.classify_intent(message, primary_asset_code, all_asset_codes, request.history)

        # Internal trackers
        data_payload: Optional[Dict[str, Any]] = None
        nav_action: Optional[NavigationAction] = None
        tb_payload: Optional[Dict[str, Any]] = None
        result_status = "FOUND"
        retrieved_context = ""
        sources: List[str] = []
        formatted_message: Optional[str] = None

        try:
            # 3. Handle Navigation queries
            if response_type == "navigation":
                sources.append("frontend-navigation")
                if sub_intent == "NAV_PREDICTIONS":
                    nav_action = NAVIGATION_MAP["predictions"]
                    retrieved_context = (
                        "## 🔮 Predictions View Navigation\n\n"
                        "You can monitor all 50-hour failure probabilities, component degradation models, "
                        "and TreeSHAP causal risk drivers on the **Predictions** page.\n\n"
                        "**Path:** `Dashboard → Predictions`"
                    )
                elif sub_intent == "NAV_TRENDS":
                    nav_action = NAVIGATION_MAP["trends"]
                    retrieved_context = (
                        "## 📈 Sensor Trends & Anomalies\n\n"
                        "Real-time sensor telemetry, multi-channel wave signatures, and HUMS anomaly alerts "
                        "are located on the **Trends & Health** page.\n\n"
                        "**Path:** `Dashboard → Trends & Health`"
                    )
                elif sub_intent == "NAV_REPORTS":
                    nav_action = NAVIGATION_MAP["reports"]
                    retrieved_context = (
                        "## 📑 Reports & Compliance Audits\n\n"
                        "You can generate, filter, and export flight readiness audits, maintenance logs, "
                        "and component wear summaries from the **Reports** page.\n\n"
                        "**Path:** `Dashboard → Reports`"
                    )
                elif sub_intent == "NAV_OVERVIEW":
                    nav_action = NAVIGATION_MAP["overview"]
                    retrieved_context = (
                        "## 🛡️ Mission Readiness Overview\n\n"
                        "The high-level commander posture dashboard, readiness KPIs, and fleet alert queues "
                        "are found on the **Mission Overview** page.\n\n"
                        "**Path:** `Dashboard → Overview`"
                    )
                elif sub_intent == "NAV_SETTINGS":
                    nav_action = NAVIGATION_MAP["settings"]
                    retrieved_context = (
                        "## ⚙️ System Settings\n\n"
                        "Database connection status, API gateway health, and telemetry ingestion parameters "
                        "are managed in the **Settings** view.\n\n"
                        "**Path:** `Dashboard → Settings`"
                    )
                else:
                    nav_action = NAVIGATION_MAP["fleet"]
                    retrieved_context = (
                        "## 📋 Fleet Assets Navigation\n\n"
                        "You can inspect the entire vehicle inventory, review platform operational statuses, "
                        "and drill down into subsystem health on the **Fleet Assets** page.\n\n"
                        "**Path:** `Dashboard → Fleet Assets`"
                    )

            # 4. Handle SentinelAI Conceptual Knowledge queries
            elif response_type == "knowledge":
                sources.append("project-knowledge")
                q_lower = message.lower()
                if "model" in q_lower or "prediction" in q_lower or "ml" in q_lower:
                    retrieved_context = PROJECT_KNOWLEDGE["models"]
                elif "readiness" in q_lower or "tier" in q_lower or "score" in q_lower or "status" in q_lower:
                    retrieved_context = PROJECT_KNOWLEDGE["readiness"]
                elif "dashboard" in q_lower or "view" in q_lower:
                    retrieved_context = PROJECT_KNOWLEDGE["dashboard"]
                else:
                    retrieved_context = PROJECT_KNOWLEDGE["sentinelai"]

            # 5. Handle Database Data queries & Follow-ups
            elif response_type in ("data", "mixed"):
                sources.append("database")

                if sub_intent == "COMPARE_ASSETS" and len(all_asset_codes) >= 2:
                    data_payload, retrieved_context, result_status = self._compare_assets(db, all_asset_codes[0], all_asset_codes[1])
                    nav_action = NAVIGATION_MAP["predictions"]
                elif sub_intent == "DEGRADED_ASSETS_CAUSES":
                    data_payload, retrieved_context, result_status = self._get_degraded_assets_causes(db, all_asset_codes)
                    nav_action = NAVIGATION_MAP["fleet"]
                elif sub_intent == "CONVERSATIONAL_FOLLOWUP":
                    data_payload, retrieved_context, result_status = self._handle_conversational_followup(db, message, request.history, primary_asset_code)
                elif sub_intent in ("ASSET_TROUBLESHOOTING", "TROUBLESHOOT_ASSET") and primary_asset_code:
                    tb_payload, retrieved_context, result_status = self._troubleshoot_asset(db, primary_asset_code)
                    nav_action = NAVIGATION_MAP["fleet"]
                    response_type = "troubleshooting"
                elif sub_intent == "ASSET_TREND" and primary_asset_code:
                    data_payload, retrieved_context, result_status = self._get_asset_trend(db, primary_asset_code)
                    nav_action = NAVIGATION_MAP["trends"]
                elif sub_intent == "ASSET_OVERVIEW" and primary_asset_code:
                    data_payload, retrieved_context, result_status = self._get_asset_overview(db, primary_asset_code)
                    nav_action = NAVIGATION_MAP["fleet"] if result_status == "NOT_FOUND" else None
                elif sub_intent == "ASSET_SENSORS" and primary_asset_code:
                    data_payload, retrieved_context, result_status = self._get_asset_sensors(db, primary_asset_code)
                    nav_action = NAVIGATION_MAP["trends"]
                elif sub_intent == "ASSET_MAINTENANCE" and primary_asset_code:
                    data_payload, retrieved_context, result_status = self._get_asset_maintenance(db, primary_asset_code)
                    nav_action = NAVIGATION_MAP["reports"]
                elif sub_intent in ("ASSET_FAILURE_RISK", "ASSET_STATUS") and primary_asset_code:
                    data_payload, retrieved_context, result_status = self._get_asset_overview(db, primary_asset_code)
                    nav_action = NAVIGATION_MAP["predictions"]
                elif sub_intent == "HIGHEST_FAILURE_RISK":
                    data_payload, retrieved_context, result_status = self._get_highest_failure_risk(db)
                    nav_action = NAVIGATION_MAP["predictions"]
                elif sub_intent in ("DEGRADED_ASSETS", "DATA_AND_NAVIGATION"):
                    data_payload, retrieved_context, result_status = self._get_degraded_assets(db)
                    nav_action = NAVIGATION_MAP["fleet"]
                elif sub_intent == "FILTER_FAILURE_RISK":
                    thresh_match = re.search(r"(\d{2})%", message) or re.search(r"above\s*(\d{2})", message, re.IGNORECASE)
                    threshold = float(thresh_match.group(1)) if thresh_match else 70.0
                    data_payload, retrieved_context, result_status = self._filter_failure_risk(db, threshold)
                    nav_action = NAVIGATION_MAP["predictions"]
                elif sub_intent in ("READY_COUNTS", "FLEET_STATUS"):
                    data_payload, retrieved_context, result_status = self._get_readiness_counts(db)
                elif sub_intent == "RECENT_ANOMALIES":
                    data_payload, retrieved_context, result_status = self._get_recent_anomalies(db)
                    nav_action = NAVIGATION_MAP["trends"]
                elif sub_intent == "CRITICAL_ALERTS":
                    data_payload, retrieved_context, result_status = self._get_critical_alerts(db)
                    nav_action = NAVIGATION_MAP["overview"]
                elif request.history:
                    data_payload, retrieved_context, result_status = self._handle_conversational_followup(db, message, request.history, primary_asset_code)
                else:
                    data_payload, retrieved_context, result_status = self._get_all_assets_summary(db)
                    nav_action = NAVIGATION_MAP["fleet"]

                if response_type == "mixed" and not nav_action:
                    nav_action = NAVIGATION_MAP["fleet"]

            # 6. Handle General conversation / Conversational follow-up / Out-of-Domain queries
            elif response_type == "general":
                if sub_intent == "GREETING":
                    formatted_message = (
                        "### 🛡️ SentinelAI Operational Copilot\n\n"
                        "Greetings! I am **SentinelAI**, an operational AI assistant dedicated **exclusively** to the "
                        "**SentinelAI Defense Mission Readiness and Predictive Maintenance Platform**.\n\n"
                        "I monitor 50 tactical platforms (`A001` through `A050`), analyzing real-time telemetry, "
                        "predicting component failures up to 50 hours in advance, and calculating mission readiness tiers.\n\n"
                        "**Operational Capabilities:**\n"
                        "- 📊 **Fleet Readiness:** *\"What is our current fleet readiness?\"* or *\"How many assets are ready?\"*\n"
                        "- 🔍 **Asset Diagnostics:** *\"Why is A021 down?\"* or *\"Check asset A003\"*\n"
                        "- ⚠️ **Failure Predictions:** *\"Which assets have highest failure risk?\"*\n"
                        "- 📈 **Sensor Anomalies:** *\"Show recent telemetry anomalies\"*\n"
                        "- 🔧 **Maintenance Planning:** *\"Which assets are overdue for maintenance?\"*\n"
                        "- 🗺️ **Platform Navigation:** *\"Where can I view sensor trends?\"*\n\n"
                        "How can I assist your fleet command operations today?"
                    )
                    result_status = "FOUND"
                elif request.history:
                    # Check if conversational follow-up resolves to platform context from previous turns
                    data_payload, retrieved_context, result_status = self._handle_conversational_followup(db, message, request.history, primary_asset_code)
                    if not retrieved_context:
                        # History did not resolve to platform data -> Return Scope Disclaimer
                        formatted_message = (
                            "### ⚠️ SentinelAI Operational Scope Notice\n\n"
                            "I am **SentinelAI**, an operational AI copilot dedicated **exclusively** to the "
                            "**SentinelAI Defense Mission Readiness & Predictive Maintenance Platform**.\n\n"
                            "I cannot answer general knowledge, jokes, weather forecasts, entertainment, or queries unrelated to this platform.\n\n"
                            "**Please ask platform-related queries such as:**\n"
                            "- 📊 **Fleet Readiness:** *\"What is our current fleet readiness?\"* or *\"How many assets are ready?\"*\n"
                            "- 🔍 **Asset Diagnostics:** *\"Why is A021 down?\"* or *\"Diagnose platform A003\"*\n"
                            "- ⚠️ **Failure Risks:** *\"Which assets have highest failure risk?\"*\n"
                            "- 📈 **Telemetry Anomalies:** *\"Are there any active sensor anomalies?\"*\n"
                            "- 🔧 **Maintenance Schedules:** *\"Which assets are overdue for maintenance?\"*\n"
                            "- 🗺️ **Platform Navigation:** *\"Where can I inspect prediction models?\"*"
                        )
                        result_status = "OUT_OF_DOMAIN"
                else:
                    # Direct out-of-domain / unrelated inquiry -> Instant Scope Disclaimer
                    formatted_message = (
                        "### ⚠️ SentinelAI Operational Scope Notice\n\n"
                        "I am **SentinelAI**, an operational AI copilot dedicated **exclusively** to the "
                        "**SentinelAI Defense Mission Readiness & Predictive Maintenance Platform**.\n\n"
                        "I cannot answer general knowledge, jokes, weather forecasts, entertainment, or queries unrelated to this platform.\n\n"
                        "**Please ask platform-related queries such as:**\n"
                        "- 📊 **Fleet Readiness:** *\"What is our current fleet readiness?\"* or *\"How many assets are ready?\"*\n"
                        "- 🔍 **Asset Diagnostics:** *\"Why is A021 down?\"* or *\"Diagnose platform A003\"*\n"
                        "- ⚠️ **Failure Risks:** *\"Which assets have highest failure risk?\"*\n"
                        "- 📈 **Telemetry Anomalies:** *\"Are there any active sensor anomalies?\"*\n"
                        "- 🔧 **Maintenance Schedules:** *\"Which assets are overdue for maintenance?\"*\n"
                        "- 🗺️ **Platform Navigation:** *\"Where can I inspect prediction models?\"*"
                    )
                    result_status = "OUT_OF_DOMAIN"

            # 7. Response Synthesis via IBM Bob API (when configured, not pre-formatted, and not OUT_OF_DOMAIN / NOT_FOUND)
            if not formatted_message and ibm_bob_client.is_configured and result_status not in ("NOT_FOUND", "OUT_OF_DOMAIN"):
                history_dicts = [{"role": h.role, "content": h.content} for h in request.history]
                context_block = f"RETRIEVED_DATABASE_CONTEXT:\n{retrieved_context}" if retrieved_context else ""
                
                bob_response = ibm_bob_client.generate_chat_response(
                    user_query=message,
                    context_block=context_block,
                    history=history_dicts
                )
                if bob_response:
                    formatted_message = bob_response
                    sources.append("ibm-bob")

            # 8. Grounded Resilient Fallback Engine
            if not formatted_message:
                if retrieved_context:
                    formatted_message = retrieved_context
                elif request.history:
                    _, followup_md, _ = self._handle_conversational_followup(db, message, request.history, primary_asset_code)
                    formatted_message = followup_md if followup_md else (
                        "### ⚠️ SentinelAI Operational Scope Notice\n\n"
                        "I am **SentinelAI**, an operational AI copilot dedicated **exclusively** to the "
                        "**SentinelAI Defense Mission Readiness & Predictive Maintenance Platform**.\n\n"
                        "I cannot answer general knowledge, jokes, weather, or queries unrelated to this platform.\n\n"
                        "**How I can assist your fleet operations:**\n"
                        "- Check fleet readiness or mission deployability\n"
                        "- Diagnose degraded platforms (e.g. `A021`)\n"
                        "- Review highest failure probability components\n"
                        "- Inspect telemetry sensor readings and anomalies"
                    )
                else:
                    formatted_message = (
                        "### ⚠️ SentinelAI Operational Scope Notice\n\n"
                        "I am **SentinelAI**, an operational AI copilot dedicated **exclusively** to the "
                        "**SentinelAI Defense Mission Readiness & Predictive Maintenance Platform**.\n\n"
                        "I cannot answer general knowledge, jokes, weather, or queries unrelated to this platform.\n\n"
                        "**How I can assist your fleet operations:**\n"
                        "- Check fleet readiness or mission deployability\n"
                        "- Diagnose degraded platforms (e.g. `A021`)\n"
                        "- Review highest failure probability components\n"
                        "- Inspect telemetry sensor readings and anomalies"
                    )

            # 9. Generate dynamic context-aware suggestions
            dynamic_suggestions = self._generate_dynamic_suggestions(
                intent=sub_intent,
                asset_code=primary_asset_code if result_status == "FOUND" else None,
                data_payload=data_payload
            )

            return ChatResponse(
                success=True,
                message=formatted_message,
                responseType=response_type,
                resultStatus=result_status,
                data=data_payload,
                navigation=nav_action,
                troubleshooting=tb_payload,
                suggestions=dynamic_suggestions,
                sources=list(set(sources)),
                requestId=req_id,
                intent=sub_intent,
                confidence=confidence,
            )

        except Exception as exc:
            logger.exception("Error processing chat inquiry: %s", exc)
            return ChatResponse(
                success=False,
                message="I couldn't retrieve the requested SentinelAI data right now. Please verify backend connection and try again.",
                responseType="error",
                resultStatus="DATABASE_ERROR",
                data=None,
                navigation=None,
                troubleshooting=None,
                suggestions=["Show all assets", "Which assets are degraded?", "System health"],
                sources=[],
                requestId=req_id,
                intent="ERROR",
                confidence=0.0,
            )


chat_service = ChatService()
