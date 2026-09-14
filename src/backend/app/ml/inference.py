import logging
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd
from app.ml.registry import model_registry
from app.core.exceptions import SentinelAIException

logger = logging.getLogger("sentinelai.ml.inference")

def map_probability_to_risk(prob: float) -> str:
    """Map failure probability to standardized risk tiers."""
    if prob < 0.30:
        return "LOW"
    elif prob < 0.70:
        return "MEDIUM"
    return "HIGH"

def run_unified_prediction(canonical_df: pd.DataFrame) -> Dict[str, Any]:
    """
    Runs production inference using Model A (Failure Probability),
    Model B (Remaining Useful Life), and Model C (Failure Mode Diagnosis).
    """
    preprocessor = model_registry.get_preprocessor()
    model_a = model_registry.get_model_a()
    model_b = model_registry.get_model_b()
    model_c = model_registry.get_model_c()
    encoder_c = model_registry.get_failure_mode_encoder()

    if not all([preprocessor, model_a, model_b, model_c, encoder_c]):
        raise SentinelAIException(
            message="One or more predictive models are unavailable in the model registry.",
            status_code=503
        )

    # 1. Apply column transformer preprocessing
    X_trans = preprocessor.transform(canonical_df)

    # 2. Model A: Failure Probability & Risk
    probs_a = model_a.predict_proba(X_trans)[:, 1]
    fail_prob = float(np.clip(probs_a[0], 0.0, 1.0))
    risk_tier = map_probability_to_risk(fail_prob)
    pred_failure = bool(fail_prob >= 0.50)

    # 3. Model B: Remaining Useful Life (RUL)
    preds_b = model_b.predict(X_trans)
    rul_hours = round(float(np.clip(preds_b[0], 0.0, None)), 1)

    # 4. Model C: Failure Mode Diagnosis & Confidence
    probs_c = model_c.predict_proba(X_trans)[0]
    best_idx = int(np.argmax(probs_c))
    predicted_mode = str(encoder_c.inverse_transform([best_idx])[0])
    mode_confidence = round(float(probs_c[best_idx]), 4)

    return {
        "failure_probability": round(fail_prob, 4),
        "predicted_failure": pred_failure,
        "risk_level": risk_tier,
        "rul_hours": rul_hours,
        "predicted_failure_mode": predicted_mode,
        "confidence": mode_confidence,
        "model_version": "1.0.0"
    }

def run_anomaly_detection(sensor_dict: Dict[str, float]) -> Dict[str, Any]:
    """
    Runs Random Forest anomaly detection and sensor attribution using
    baseline means, standard deviations, and sigma thresholds.
    """
    rf_model = model_registry.get_anomaly_rf()
    scaler = model_registry.get_sensor_scaler()
    config = model_registry.get_anomaly_config()

    if not rf_model or not scaler or not config:
        raise SentinelAIException(
            message="Anomaly detection models or configurations are unavailable.",
            status_code=503
        )

    feature_names = config.get("features", [])
    threshold = float(config.get("score_threshold", 0.5))
    sigma_thresh = float(config.get("attribution_threshold_sigma", 1.8))
    baseline_means = config.get("baseline_means", {})
    baseline_stds = config.get("baseline_stds", {})

    # Form feature vector
    raw_vector = [sensor_dict.get(feat, baseline_means.get(feat, 0.0)) for feat in feature_names]
    raw_df = pd.DataFrame([raw_vector], columns=feature_names)

    # Scale features
    scaled_array = scaler.transform(raw_df)

    # Random Forest Anomaly Probability
    probs = rf_model.predict_proba(scaled_array)[:, 1]
    anomaly_score = float(np.clip(probs[0], 0.0, 1.0))
    is_anomaly = bool(anomaly_score >= threshold)

    # Determine Severity
    if not is_anomaly:
        severity = "NORMAL"
    elif anomaly_score < 0.65:
        severity = "LOW"
    elif anomaly_score < 0.80:
        severity = "MEDIUM"
    elif anomaly_score < 0.90:
        severity = "HIGH"
    else:
        severity = "CRITICAL"

    # Sensor Attribution Analysis
    attributions = []
    cause_sensors = []

    for feat in feature_names:
        val = sensor_dict.get(feat, baseline_means.get(feat, 0.0))
        mean = baseline_means.get(feat, 0.0)
        std = baseline_stds.get(feat, 1.0) or 1.0
        sigma = (val - mean) / std
        is_cause = bool(is_anomaly and abs(sigma) >= sigma_thresh)

        attributions.append({
            "sensor": feat,
            "value": round(float(val), 2),
            "baseline_mean": round(float(mean), 2),
            "baseline_std": round(float(std), 2),
            "sigma_deviation": round(float(sigma), 2),
            "is_anomaly_cause": is_cause
        })

        if is_cause:
            direction = "+" if sigma > 0 else ""
            cause_sensors.append(f"{feat} ({direction}{sigma:.1f}σ)")

    if is_anomaly:
        if cause_sensors:
            explanation = f"Anomaly detected with attribution to: {', '.join(cause_sensors)}."
            affected_sensor = ", ".join([a["sensor"] for a in attributions if a["is_anomaly_cause"]])
        else:
            explanation = "Multivariate telemetry anomaly detected exceeding baseline variance."
            affected_sensor = "System-wide"
    else:
        explanation = "Telemetry operating within nominal baseline parameters."
        affected_sensor = None

    return {
        "is_anomaly": is_anomaly,
        "anomaly_score": round(anomaly_score, 4),
        "threshold": threshold,
        "severity": severity,
        "affected_sensor": affected_sensor,
        "explanation": explanation,
        "attributed_sensors": attributions,
        "model_version": "1.0.0"
    }
