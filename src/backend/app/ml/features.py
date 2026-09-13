import logging
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from app.models.sensor import SensorReading
from app.models.asset import Asset
from app.core.exceptions import ResourceNotFoundException

logger = logging.getLogger("sentinelai.ml.features")

ANOMALY_FEATURE_NAMES = [
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
    "ambient_temperature"
]

CANONICAL_21_FEATURES = [
    "component_type",
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

def extract_features_from_db(
    db: Session,
    asset_id: int
) -> Tuple[SensorReading, Dict[str, float], pd.DataFrame]:
    """
    Retrieves the most recent telemetry readings from PostgreSQL for an asset,
    computes rolling statistics & differences, and outputs:
    1. latest SensorReading ORM object
    2. raw dictionary for Anomaly Detection (11 features)
    3. pandas DataFrame formatted with exact 21 canonical features for Models A, B, C
    """
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise ResourceNotFoundException("Asset", asset_id)

    # Fetch the 5 most recent telemetry readings to calculate real rolling features
    recent_readings = (
        db.query(SensorReading)
        .filter(SensorReading.asset_id == asset_id)
        .order_by(SensorReading.timestamp.desc())
        .limit(5)
        .all()
    )

    if not recent_readings:
        raise ResourceNotFoundException("Sensor readings for Asset", asset_id)

    latest = recent_readings[0]

    # 1. 11 Features for Anomaly Detection
    anomaly_dict = {
        "temperature": float(latest.temperature if latest.temperature is not None else 75.0),
        "vibration": float(latest.vibration if latest.vibration is not None else 2.5),
        "oil_pressure": float(latest.oil_pressure if latest.oil_pressure is not None else 75.0),
        "fuel_pressure": float(latest.fuel_pressure if latest.fuel_pressure is not None else 54.0),
        "rpm": float(latest.rpm if latest.rpm is not None else 1800.0),
        "hydraulic_pressure": float(latest.hydraulic_pressure if latest.hydraulic_pressure is not None else 148.0),
        "battery_voltage": float(latest.battery_voltage if latest.battery_voltage is not None else 24.0),
        "coolant_temperature": float(latest.coolant_temperature if latest.coolant_temperature is not None else 78.0),
        "operating_hours": float(latest.operating_hours if latest.operating_hours is not None else 300.0),
        "load_percentage": float(latest.load_percentage if latest.load_percentage is not None else 60.0),
        "ambient_temperature": float(latest.ambient_temperature if latest.ambient_temperature is not None else 30.0),
    }

    # 2. Compute rolling statistics & changes from historical records if available
    temps = [r.temperature for r in recent_readings if r.temperature is not None]
    vibs = [r.vibration for r in recent_readings if r.vibration is not None]
    oils = [r.oil_pressure for r in recent_readings if r.oil_pressure is not None]

    temp_change = 0.0
    vib_change = 0.0
    oil_change = 0.0

    if len(recent_readings) >= 2:
        prev = recent_readings[1]
        if latest.temperature is not None and prev.temperature is not None:
            temp_change = round(float(latest.temperature - prev.temperature), 3)
        if latest.vibration is not None and prev.vibration is not None:
            vib_change = round(float(latest.vibration - prev.vibration), 3)
        if latest.oil_pressure is not None and prev.oil_pressure is not None:
            oil_change = round(float(latest.oil_pressure - prev.oil_pressure), 3)

    rolling_temp_mean = round(float(np.mean(temps)), 3) if temps else anomaly_dict["temperature"]
    rolling_vib_mean = round(float(np.mean(vibs)), 3) if vibs else anomaly_dict["vibration"]
    rolling_oil_mean = round(float(np.mean(oils)), 3) if oils else anomaly_dict["oil_pressure"]

    # 3. Assemble Canonical 21 Feature Row for Models A, B, C
    feature_row = {
        "component_type": str(latest.component_type or "Engine"),
        "temperature": anomaly_dict["temperature"],
        "vibration": anomaly_dict["vibration"],
        "oil_pressure": anomaly_dict["oil_pressure"],
        "fuel_pressure": anomaly_dict["fuel_pressure"],
        "rpm": anomaly_dict["rpm"],
        "hydraulic_pressure": anomaly_dict["hydraulic_pressure"],
        "battery_voltage": anomaly_dict["battery_voltage"],
        "coolant_temperature": anomaly_dict["coolant_temperature"],
        "operating_hours": anomaly_dict["operating_hours"],
        "load_percentage": anomaly_dict["load_percentage"],
        "ambient_temperature": anomaly_dict["ambient_temperature"],
        "temperature_change": temp_change,
        "vibration_change": vib_change,
        "oil_pressure_change": oil_change,
        "rolling_temperature_mean": rolling_temp_mean,
        "rolling_vibration_mean": rolling_vib_mean,
        "rolling_pressure_mean": rolling_oil_mean,
        "previous_failures": 0,
        "hours_since_last_maintenance": 100,
        "anomaly_label": int(latest.anomaly_label or 0),
    }

    canonical_df = pd.DataFrame([feature_row])[CANONICAL_21_FEATURES]
    return latest, anomaly_dict, canonical_df
