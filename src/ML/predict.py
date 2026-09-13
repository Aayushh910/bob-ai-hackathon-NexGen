"""
MissionGuard ML Pipeline - Unified Multi-Model Prediction Interface
=====================================================================
Combines Model A (Failure Probability & Risk), Model B (Remaining Useful Life),
and Model C (Failure Mode & Confidence) into a single, high-performance,
production-ready prediction API.
"""

import os
import json
import logging
from typing import Dict, Any, Union, List, Optional
import numpy as np
import pandas as pd
import joblib

from feature_engineering import validate_inference_input
from model_a_failure_probability import map_probability_to_risk

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "Models")


class MissionGuardPredictor:
    """
    Unified Inference Engine for MissionGuard Predictive Maintenance.
    Loads and executes:
    - Model A: Failure Probability & Risk Categorization
    - Model B: Remaining Useful Life (RUL) in Operating Hours
    - Model C: Failure Mode Diagnosis & Confidence
    """

    def __init__(self, models_dir: Optional[str] = None):
        self.models_dir = models_dir or MODELS_DIR
        self._load_artifacts()

    def _load_artifacts(self):
        """Loads serialized preprocessor, models, and encoders."""
        prep_path = os.path.join(self.models_dir, "sensor_feature_preprocessor.joblib")
        mod_a_path = os.path.join(self.models_dir, "failure_probability_model.joblib")
        mod_b_path = os.path.join(self.models_dir, "rul_model.joblib")
        mod_c_path = os.path.join(self.models_dir, "failure_mode_model.joblib")
        enc_c_path = os.path.join(self.models_dir, "failure_mode_label_encoder.joblib")

        missing = [p for p in [prep_path, mod_a_path, mod_b_path, mod_c_path, enc_c_path] if not os.path.exists(p)]
        if missing:
            raise FileNotFoundError(
                f"Missing required model artifacts in {self.models_dir}: {missing}. "
                f"Run train.py first to generate and save models."
            )

        logger.info("Loading MissionGuard ML artifacts...")
        self.preprocessor = joblib.load(prep_path)
        self.model_a = joblib.load(mod_a_path)
        self.model_b = joblib.load(mod_b_path)
        self.model_c = joblib.load(mod_c_path)
        self.label_encoder_c = joblib.load(enc_c_path)
        logger.info("All 3 models and preprocessors successfully loaded.")

    def predict(
        self,
        payload: Union[Dict[str, Any], List[Dict[str, Any]], pd.DataFrame]
    ) -> Union[Dict[str, Any], List[Dict[str, Any]]]:
        """
        Executes unified prediction pipeline for all three models on input telemetry.
        
        Parameters:
            payload: Dict with sensor features, list of dicts, or pandas DataFrame.
            
        Returns:
            Unified prediction dictionary (or list of dicts for batch requests):
            {
                "asset_id": "A001",
                "failure_prediction": {
                    "failure_probability": 0.82,
                    "failure_risk": "HIGH"
                },
                "remaining_useful_life": {
                    "hours": 37.5
                },
                "failure_mode": {
                    "predicted_failure_mode": "Pressure Drop",
                    "confidence": 0.84
                }
            }
        """
        is_single = isinstance(payload, dict)
        raw_list = [payload] if is_single else (payload if isinstance(payload, list) else payload.to_dict(orient="records"))

        # Extract asset_id or identifiers if provided
        asset_ids = [item.get("asset_id", "A001") for item in raw_list]
        component_types = [item.get("component_type", "Engine") for item in raw_list]

        # Validate input schema and order canonical features
        X_df = validate_inference_input(payload)
        X_trans = self.preprocessor.transform(X_df)

        # 1. Model A Inference (Failure Probability & Risk)
        probs_a = self.model_a.predict_proba(X_trans)[:, 1]

        # 2. Model B Inference (Remaining Useful Life)
        preds_b = self.model_b.predict(X_trans)
        preds_b = np.clip(preds_b, 0.0, None)

        # 3. Model C Inference (Failure Mode & Confidence)
        probs_c = self.model_c.predict_proba(X_trans)
        pred_indices_c = np.argmax(probs_c, axis=1)
        pred_labels_c = self.label_encoder_c.inverse_transform(pred_indices_c)

        results = []
        for i in range(len(raw_list)):
            prob_val = float(np.clip(probs_a[i], 0.0, 1.0))
            risk_val = map_probability_to_risk(prob_val)
            rul_val = round(float(preds_b[i]), 1)
            fmode_val = str(pred_labels_c[i])
            conf_val = round(float(probs_c[i, pred_indices_c[i]]), 4)

            unified_result = {
                "asset_id": asset_ids[i],
                "component_type": component_types[i],
                "failure_prediction": {
                    "failure_probability": round(prob_val, 4),
                    "failure_risk": risk_val
                },
                "remaining_useful_life": {
                    "hours": rul_val
                },
                "failure_mode": {
                    "predicted_failure_mode": fmode_val,
                    "confidence": conf_val
                }
            }
            results.append(unified_result)

        return results[0] if is_single else results


# Module-level singleton instance for zero-overhead imports
_PREDICTOR_INSTANCE: Optional[MissionGuardPredictor] = None


def predict(payload: Union[Dict[str, Any], List[Dict[str, Any]], pd.DataFrame]) -> Union[Dict[str, Any], List[Dict[str, Any]]]:
    """Global functional interface for unified predictions."""
    global _PREDICTOR_INSTANCE
    if _PREDICTOR_INSTANCE is None:
        _PREDICTOR_INSTANCE = MissionGuardPredictor()
    return _PREDICTOR_INSTANCE.predict(payload)


if __name__ == "__main__":
    predictor = MissionGuardPredictor()

    test_scenarios = [
        {
            "scenario": "Healthy Asset (Nominal Telemetry, No Degradation)",
            "telemetry": {
                "asset_id": "A001",
                "component_type": "Battery",
                "temperature": 71.032,
                "vibration": 2.821,
                "oil_pressure": 74.406,
                "fuel_pressure": 55.442,
                "rpm": 1810.502,
                "hydraulic_pressure": 150.837,
                "battery_voltage": 24.296,
                "coolant_temperature": 75.522,
                "operating_hours": 277.0,
                "load_percentage": 62.228,
                "ambient_temperature": 30.338,
                "temperature_change": 0.0,
                "vibration_change": 0.0,
                "oil_pressure_change": 0.0,
                "rolling_temperature_mean": 71.032,
                "rolling_vibration_mean": 2.821,
                "rolling_pressure_mean": 74.406,
                "previous_failures": 0,
                "hours_since_last_maintenance": 0,
                "anomaly_label": 0
            }
        },
        {
            "scenario": "Degrading Asset (Elevated Thermal & Vibration Readings)",
            "telemetry": {
                "asset_id": "A002",
                "component_type": "Engine",
                "temperature": 80.5,
                "vibration": 3.65,
                "oil_pressure": 68.2,
                "fuel_pressure": 52.0,
                "rpm": 1845.0,
                "hydraulic_pressure": 142.0,
                "battery_voltage": 23.9,
                "coolant_temperature": 78.5,
                "operating_hours": 450.0,
                "load_percentage": 74.0,
                "ambient_temperature": 26.0,
                "temperature_change": 3.2,
                "vibration_change": 0.6,
                "oil_pressure_change": -3.5,
                "rolling_temperature_mean": 79.0,
                "rolling_vibration_mean": 3.4,
                "rolling_pressure_mean": 70.0,
                "previous_failures": 1,
                "hours_since_last_maintenance": 85,
                "anomaly_label": 0
            }
        },
        {
            "scenario": "Critical Failure Imminent (Tool Wear & Extreme Anomaly)",
            "telemetry": {
                "asset_id": "A001",
                "component_type": "Battery",
                "temperature": 89.961,
                "vibration": 6.952,
                "oil_pressure": 61.3,
                "fuel_pressure": 54.749,
                "rpm": 1888.333,
                "hydraulic_pressure": 134.175,
                "battery_voltage": 24.355,
                "coolant_temperature": 75.981,
                "operating_hours": 248.0,
                "load_percentage": 69.853,
                "ambient_temperature": 21.563,
                "temperature_change": 12.116,
                "vibration_change": 4.152,
                "oil_pressure_change": -15.811,
                "rolling_temperature_mean": 79.137,
                "rolling_vibration_mean": 3.245,
                "rolling_pressure_mean": 72.822,
                "previous_failures": 1,
                "hours_since_last_maintenance": 0,
                "anomaly_label": 1
            }
        }
    ]

    print("\n" + "=" * 70)
    print("MISSIONGUARD UNIFIED MULTI-MODEL PREDICTION DEMONSTRATION")
    print("=" * 70)
    for test_case in test_scenarios:
        print(f"\n>>> Scenario: {test_case['scenario']}")
        output = predictor.predict(test_case['telemetry'])
        print(json.dumps(output, indent=2))


