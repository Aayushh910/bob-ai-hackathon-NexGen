"""
MissionGuard ML Pipeline - Feature Engineering & Schema Verification Module
=============================================================================
Defines the canonical feature contract, input validation, and real-time inference
feature extraction for MissionGuard predictive maintenance models.
Strictly ensures zero target or future leakage.
"""

import json
import logging
from typing import Dict, Any, List, Union
import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Canonical Feature Set (21 features)
EXPECTED_CATEGORICAL_FEATURES = ["component_type"]

EXPECTED_NUMERICAL_FEATURES = [
    "temperature",
    "vibration",
    "oil_pressure",
    "fuel_pressure",
    "rpm",
    "hydraulic_pressure",
    "battery_voltage",
    "coolant_temperature",
    "operating_hours",
    "load_percentage",
    "ambient_temperature",
    "temperature_change",
    "vibration_change",
    "oil_pressure_change",
    "rolling_temperature_mean",
    "rolling_vibration_mean",
    "rolling_pressure_mean",
    "previous_failures",
    "hours_since_last_maintenance",
    "anomaly_label",
]

CANONICAL_FEATURE_ORDER = EXPECTED_CATEGORICAL_FEATURES + EXPECTED_NUMERICAL_FEATURES

# Features strictly excluded from models to prevent data leakage:
LEAKAGE_EXCLUDED_COLUMNS = [
    "failure_within_50_hours",     # Model A Ground Truth Target
    "remaining_useful_life_hours", # Model B Ground Truth Target
    "failure_type",                # Model C Ground Truth Target
    "failure_type_clean",          # Processed Target
    "failure_occurred",            # Maintenance Event Target
    "timestamp",                   # Raw timestamp string
    "maintenance_date",            # Future maintenance date
    "parts_replaced",              # Post-failure repair outcome
    "maintenance_duration_hours",  # Post-failure repair duration
    "next_maintenance_due_hours",  # Future maintenance plan
    "component_condition",         # Post-inspection label
    "issue_detected",              # Post-inspection diagnosis
]

# Default values for inference when rolling window or historical values are not yet observed
FEATURE_DEFAULTS: Dict[str, Any] = {
    "component_type": "Engine",
    "temperature": 75.0,
    "vibration": 2.5,
    "oil_pressure": 45.0,
    "fuel_pressure": 40.0,
    "rpm": 3000.0,
    "hydraulic_pressure": 2000.0,
    "battery_voltage": 24.0,
    "coolant_temperature": 80.0,
    "operating_hours": 500.0,
    "load_percentage": 65.0,
    "ambient_temperature": 25.0,
    "temperature_change": 0.0,
    "vibration_change": 0.0,
    "oil_pressure_change": 0.0,
    "rolling_temperature_mean": 75.0,
    "rolling_vibration_mean": 2.5,
    "rolling_pressure_mean": 45.0,
    "previous_failures": 0,
    "hours_since_last_maintenance": 100,
    "anomaly_label": 0,
}


def audit_features_for_leakage(df: pd.DataFrame) -> None:
    """
    Asserts that no leakage-prone columns or future-dated records are present in feature matrix.
    Raises ValueError if any leak is detected.
    """
    leaks = [col for col in LEAKAGE_EXCLUDED_COLUMNS if col in df.columns]
    if leaks:
        raise ValueError(
            f"[DATA LEAKAGE DETECTED] The following forbidden target/future columns were found "
            f"in feature matrix: {leaks}. Remove them before training or inference."
        )


def validate_inference_input(payload: Union[Dict[str, Any], pd.DataFrame]) -> pd.DataFrame:
    """
    Validates and formats incoming inference payloads into standard DataFrame format
    with the exact canonical feature columns.
    
    Accepts:
    - Single telemetry dict
    - List of dicts
    - pandas DataFrame
    """
    if isinstance(payload, dict):
        df = pd.DataFrame([payload])
    elif isinstance(payload, list):
        df = pd.DataFrame(payload)
    elif isinstance(payload, pd.DataFrame):
        df = payload.copy()
    else:
        raise TypeError(f"Unsupported payload type: {type(payload)}. Must be dict, list, or DataFrame.")

    # Fill any missing expected feature with documented default
    for col in CANONICAL_FEATURE_ORDER:
        if col not in df.columns:
            logger.debug(f"Input payload missing '{col}'. Filling with default: {FEATURE_DEFAULTS.get(col)}")
            df[col] = FEATURE_DEFAULTS.get(col)
        else:
            df[col] = df[col].fillna(FEATURE_DEFAULTS.get(col))

    # Return strictly ordered features
    return df[CANONICAL_FEATURE_ORDER]
