import logging
from typing import Any, Dict, List, Optional, Tuple
import numpy as np

logger = logging.getLogger("sentinelai.services.scoring")

class ScoringService:
    """
    Computes business and operational metrics:
    - Anomaly Severity
    - Health Score
    - Maintenance Priority & Priority Level
    - Asset Operational Readiness Status
    """

    @staticmethod
    def calculate_anomaly_severity(anomaly_probability: float) -> float:
        """AnomalySeverity = AnomalyProbability clamped to 0 - 100."""
        return round(float(np.clip(anomaly_probability, 0.0, 100.0)), 2)

    @staticmethod
    def calculate_health_score(
        failure_risk: float,
        anomaly_severity: float,
        trend_risk: float
    ) -> float:
        """
        HealthScore = 100 - (0.50 * FailureRisk) - (0.30 * AnomalySeverity) - (0.20 * TrendRisk)
        Clamped to 0.0 - 100.0.
        """
        score = 100.0 - (0.50 * failure_risk) - (0.30 * anomaly_severity) - (0.20 * trend_risk)
        return round(float(np.clip(score, 0.0, 100.0)), 2)

    @staticmethod
    def calculate_maintenance_priority(
        failure_risk: float,
        anomaly_severity: float,
        trend_risk: float
    ) -> Tuple[float, str]:
        """
        Priority = 0.60 * FailureRisk + 0.25 * AnomalySeverity + 0.15 * TrendRisk
        Levels:
          80-100: CRITICAL
          60-79:  HIGH
          40-59:  MEDIUM
          0-39:   LOW
        """
        priority = (0.60 * failure_risk) + (0.25 * anomaly_severity) + (0.15 * trend_risk)
        priority_clamped = round(float(np.clip(priority, 0.0, 100.0)), 2)

        if priority_clamped >= 80.0:
            level = "CRITICAL"
        elif priority_clamped >= 60.0:
            level = "HIGH"
        elif priority_clamped >= 40.0:
            level = "MEDIUM"
        else:
            level = "LOW"

        return priority_clamped, level

    @staticmethod
    def calculate_asset_status(component_predictions: List[Dict[str, Any]]) -> Tuple[str, int, int, int]:
        """
        Calculates rule-based asset operational readiness status:
        - Any CRITICAL component (priority >= 80) -> NOT_READY
        - Multiple components needing attention (HIGH priority or anomalous) -> ATTENTION
        - Else -> READY

        Returns: (status, critical_count, high_priority_count, anomalous_count)
        """
        critical_count = 0
        high_priority_count = 0
        anomalous_count = 0

        for comp in component_predictions:
            p_level = comp.get("priority_level", "LOW")
            is_anomaly = bool(comp.get("anomaly_prediction") == 1)

            if p_level == "CRITICAL":
                critical_count += 1
            elif p_level == "HIGH":
                high_priority_count += 1

            if is_anomaly:
                anomalous_count += 1

        if critical_count > 0:
            status = "NOT_READY"
        elif high_priority_count > 0 or anomalous_count >= 2:
            status = "ATTENTION"
        else:
            status = "READY"

        return status, critical_count, high_priority_count, anomalous_count

scoring_service = ScoringService()
