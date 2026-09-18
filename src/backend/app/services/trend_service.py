import logging
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd

logger = logging.getLogger("sentinelai.services.trend")

# Primary telemetry channels per component type for trend evaluation
PRIMARY_TELEMETRY = {
    "Engine": ["temperature", "vibration", "oil_pressure", "rpm", "coolant_temperature"],
    "Battery": ["battery_voltage", "temperature", "load_percentage"],
    "Fuel Pump": ["fuel_pressure", "vibration", "temperature", "rpm"],
    "Hydraulic System": ["hydraulic_pressure", "vibration", "temperature"],
}

class TrendAnalysisService:
    """
    Computes rule-based Trend Risk from sensor telemetry history.
    Formula:
        TrendRisk = 0.30 * RateOfChange + 0.25 * Persistence + 0.25 * Degradation + 0.20 * MultiSensor
    All scores are normalized to 0.0 - 100.0.
    """

    @staticmethod
    def calculate_trend_risk(
        rate_of_change: float,
        persistence_score: float,
        degradation_score: float,
        multi_sensor_score: float
    ) -> float:
        raw_risk = (
            0.30 * rate_of_change +
            0.25 * persistence_score +
            0.25 * degradation_score +
            0.20 * multi_sensor_score
        )
        return round(float(np.clip(raw_risk, 0.0, 100.0)), 2)

    def evaluate_component_series(
        self,
        component_type: str,
        df_component_history: pd.DataFrame
    ) -> List[Dict[str, Any]]:
        """
        Processes a chronological DataFrame of sensor readings for a single component,
        calculating Trend Risk and sub-metrics for each timestamp.
        """
        if df_component_history.empty:
            return []

        df_sorted = df_component_history.sort_values("timestamp").reset_index(drop=True)
        channels = PRIMARY_TELEMETRY.get(component_type, ["temperature", "vibration"])
        avail_channels = [c for c in channels if c in df_sorted.columns and df_sorted[c].notnull().any()]

        if not avail_channels:
            avail_channels = [c for c in ["temperature", "vibration", "battery_voltage"] if c in df_sorted.columns]

        n = len(df_sorted)
        results = []

        for i in range(n):
            # Window up to current point (up to last 10 points)
            window_start = max(0, i - 9)
            sub = df_sorted.iloc[window_start : i + 1]

            if len(sub) == 1 or not avail_channels:
                # Baseline initial reading
                roc = 15.0
                pers = 10.0
                deg = 10.0
                multi = 10.0
            else:
                # 1. Rate of change: Average absolute percentage difference in the last step
                curr_row = sub.iloc[-1]
                prev_row = sub.iloc[-2]
                rocs = []
                for ch in avail_channels:
                    c_val = float(curr_row[ch]) if pd.notnull(curr_row[ch]) else 0.0
                    p_val = float(prev_row[ch]) if pd.notnull(prev_row[ch]) else 0.0
                    denom = abs(p_val) if abs(p_val) > 1e-4 else 1.0
                    diff_pct = abs(c_val - p_val) / denom * 100.0
                    rocs.append(min(100.0, diff_pct * 5.0))  # scaled
                roc = float(np.mean(rocs)) if rocs else 20.0

                # 2. Persistence: Variation / sustained deviation across the window
                pers_vals = []
                for ch in avail_channels:
                    vals = sub[ch].dropna()
                    if len(vals) > 1:
                        cv = float(vals.std() / (vals.mean() + 1e-4) * 100.0)
                        pers_vals.append(min(100.0, cv * 4.0))
                pers = float(np.mean(pers_vals)) if pers_vals else 15.0

                # 3. Degradation: Directional slope / drift over the window
                deg_vals = []
                for ch in avail_channels:
                    vals = sub[ch].dropna().values
                    if len(vals) > 2:
                        x = np.arange(len(vals))
                        slope, _ = np.polyfit(x, vals, 1)
                        # Positive slope on stress channels indicates degradation
                        deg_score = min(100.0, max(0.0, abs(float(slope)) * 10.0))
                        deg_vals.append(deg_score)
                deg = float(np.mean(deg_vals)) if deg_vals else 15.0

                # 4. Multi-Sensor: Proportion of channels showing above-median variance
                multi_scores = []
                for ch in avail_channels:
                    vals = sub[ch].dropna().values
                    if len(vals) > 1 and np.max(vals) > np.min(vals):
                        multi_scores.append(50.0)
                    else:
                        multi_scores.append(10.0)
                multi = float(np.mean(multi_scores)) if multi_scores else 20.0

            # Clamp sub-metrics
            roc = round(float(np.clip(roc, 0.0, 100.0)), 2)
            pers = round(float(np.clip(pers, 0.0, 100.0)), 2)
            deg = round(float(np.clip(deg, 0.0, 100.0)), 2)
            multi = round(float(np.clip(multi, 0.0, 100.0)), 2)

            t_risk = self.calculate_trend_risk(roc, pers, deg, multi)

            results.append({
                "rate_of_change": roc,
                "persistence_score": pers,
                "degradation_score": deg,
                "multi_sensor_score": multi,
                "trend_risk": t_risk,
            })

        return results

trend_service = TrendAnalysisService()
