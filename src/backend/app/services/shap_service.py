import logging
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
import shap
from app.ml.registry import model_registry

logger = logging.getLogger("sentinelai.services.shap")

FEATURE_DISPLAY_NAMES = {
    "temperature": "High Temperature",
    "vibration": "Elevated Vibration",
    "oil_pressure": "Oil Pressure Anomaly",
    "fuel_pressure": "Fuel Pressure Anomaly",
    "rpm": "RPM Instability",
    "hydraulic_pressure": "Hydraulic Pressure Anomaly",
    "battery_voltage": "Voltage Fluctuations",
    "coolant_temperature": "Coolant Temperature Spike",
    "operating_hours": "Accumulated Operating Hours",
    "load_percentage": "High Mechanical Load",
    "ambient_temperature": "Extreme Ambient Temperature",
}

class SHAPExplanationService:
    """
    Computes TreeSHAP explanations for component anomaly predictions,
    extracting top feature contributions and determining primary/secondary reasons.
    """
    _instance: Optional["SHAPExplanationService"] = None

    def __init__(self):
        self._explainers: Dict[str, shap.TreeExplainer] = {}

    @classmethod
    def get_instance(cls) -> "SHAPExplanationService":
        if cls._instance is None:
            cls._instance = SHAPExplanationService()
        return cls._instance

    def _get_explainer(self, component_type: str) -> Tuple[Any, shap.TreeExplainer]:
        norm_type = model_registry.normalize_component_type(component_type)
        if norm_type in self._explainers:
            pipeline = model_registry.get_model(norm_type, "anomaly")
            return pipeline, self._explainers[norm_type]

        pipeline = model_registry.get_model(norm_type, "anomaly")
        classifier = pipeline.named_steps["classifier"]
        explainer = shap.TreeExplainer(classifier)
        self._explainers[norm_type] = explainer
        return pipeline, explainer

    def explain_batch(
        self,
        component_type: str,
        df_features: pd.DataFrame
    ) -> List[Dict[str, Any]]:
        """
        Computes SHAP explanations for a batch of feature rows for a given component type.
        Returns a list of explanation summaries for each row.
        """
        if df_features.empty:
            return []

        pipeline, explainer = self._get_explainer(component_type)
        preprocessor = pipeline.named_steps["preprocessor"]

        # Transform features
        X_trans = preprocessor.transform(df_features)
        feature_names = list(preprocessor.get_feature_names_out())

        # Clean feature names (remove 'num__', 'cat__', etc.)
        clean_feature_names = [f.split("__")[-1] for f in feature_names]

        # Calculate SHAP values
        raw_shap = explainer.shap_values(X_trans)

        # Handle different SHAP output formats across scikit-learn/TreeSHAP versions
        # Binary classification typically yields (n_samples, n_features, 2) or list of 2 arrays
        if isinstance(raw_shap, list) and len(raw_shap) == 2:
            shap_anomaly = np.array(raw_shap[1])  # Class 1 = Anomaly
        elif isinstance(raw_shap, np.ndarray) and raw_shap.ndim == 3:
            shap_anomaly = raw_shap[:, :, 1]
        elif isinstance(raw_shap, np.ndarray) and raw_shap.ndim == 2:
            shap_anomaly = raw_shap
        else:
            shap_anomaly = np.array(raw_shap)

        results = []
        n_samples = len(df_features)

        for i in range(n_samples):
            row_shap = shap_anomaly[i]
            row_feat_vals = X_trans[i] if hasattr(X_trans, "__getitem__") else []

            # Build list of feature explanations
            explanations = []
            for j, f_name in enumerate(clean_feature_names):
                s_val = float(row_shap[j])
                raw_val = float(df_features.iloc[i].get(f_name, row_feat_vals[j] if j < len(row_feat_vals) else 0.0))
                direction = "POSITIVE" if s_val > 0 else "NEGATIVE"
                explanations.append({
                    "feature_name": f_name,
                    "shap_value": round(s_val, 4),
                    "feature_value": round(raw_val, 4),
                    "contribution_direction": direction,
                })

            # Sort by SHAP value descending (highest contribution towards anomaly)
            explanations.sort(key=lambda x: x["shap_value"], reverse=True)
            for rank_idx, exp in enumerate(explanations, start=1):
                exp["rank"] = rank_idx

            # Determine primary and secondary reasons from top positive contributions
            positives = [e for e in explanations if e["shap_value"] > 0]
            if positives:
                top_1_name = positives[0]["feature_name"]
                primary_reason = FEATURE_DISPLAY_NAMES.get(top_1_name, top_1_name.replace("_", " ").title())
            else:
                primary_reason = "Nominal Baseline"

            if len(positives) > 1:
                top_2_name = positives[1]["feature_name"]
                secondary_reason = FEATURE_DISPLAY_NAMES.get(top_2_name, top_2_name.replace("_", " ").title())
            elif len(explanations) > 1 and explanations[1]["shap_value"] != 0:
                top_2_name = explanations[1]["feature_name"]
                secondary_reason = FEATURE_DISPLAY_NAMES.get(top_2_name, top_2_name.replace("_", " ").title())
            else:
                secondary_reason = None

            results.append({
                "primary_reason": primary_reason,
                "secondary_reason": secondary_reason,
                "explanations": explanations,
            })

        return results

shap_service = SHAPExplanationService.get_instance()
