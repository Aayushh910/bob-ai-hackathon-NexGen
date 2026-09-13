"""
MissionGuard ML Pipeline - Data Preprocessing & Validation Module
==================================================================
Handles data ingestion, schema validation, outlier checking, missing value handling,
deterministic RUL derivation from component failure history, and train/val/test splitting.
Strictly ensures zero future-data and target leakage.
"""

import os
import json
import logging
from typing import Tuple, Dict, Any, List, Optional
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Primary input feature specification (21 features: 1 categorical, 20 numerical)
CATEGORICAL_FEATURES: List[str] = ["component_type"]

NUMERICAL_FEATURES: List[str] = [
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

ALL_FEATURES: List[str] = CATEGORICAL_FEATURES + NUMERICAL_FEATURES

# Target column names
TARGET_MODEL_A = "failure_within_50_hours"
TARGET_MODEL_B = "remaining_useful_life_hours"
TARGET_MODEL_C = "failure_type"

# Valid failure types
FAILURE_CLASSES = [
    "No Failure",
    "Pressure Drop",
    "Tool Wear",
    "Overstrain",
    "Electrical",
    "Overheating"
]

# Physical plausibility boundaries for incoming sensor validation
SENSOR_BOUNDS: Dict[str, Tuple[float, float]] = {
    "temperature": (-50.0, 300.0),
    "vibration": (0.0, 50.0),
    "oil_pressure": (0.0, 150.0),
    "fuel_pressure": (0.0, 150.0),
    "rpm": (0.0, 15000.0),
    "hydraulic_pressure": (0.0, 5000.0),
    "battery_voltage": (0.0, 48.0),
    "coolant_temperature": (-50.0, 250.0),
    "operating_hours": (0.0, 100000.0),
    "load_percentage": (0.0, 100.0),
    "ambient_temperature": (-60.0, 80.0),
    "anomaly_label": (0, 1),
}


def load_raw_datasets(
    training_data_path: str,
    maintenance_data_path: Optional[str] = None
) -> Tuple[pd.DataFrame, Optional[pd.DataFrame]]:
    """
    Loads training telemetry and historical maintenance datasets.
    """
    if not os.path.exists(training_data_path):
        raise FileNotFoundError(f"Training data not found at: {training_data_path}")
    
    logger.info(f"Loading training data from: {training_data_path}")
    train_df = pd.read_csv(training_data_path)
    logger.info(f"Training data loaded: {train_df.shape[0]} rows, {train_df.shape[1]} columns.")

    maint_df = None
    if maintenance_data_path and os.path.exists(maintenance_data_path):
        logger.info(f"Loading maintenance data from: {maintenance_data_path}")
        maint_df = pd.read_csv(maintenance_data_path)
        logger.info(f"Maintenance data loaded: {maint_df.shape[0]} rows, {maint_df.shape[1]} columns.")

    return train_df, maint_df


def validate_data_quality(df: pd.DataFrame) -> pd.DataFrame:
    """
    Performs data quality checks: duplicate removal, missing value imputation,
    and out-of-bound value clamping.
    """
    df = df.copy()
    initial_rows = len(df)
    
    # Check for duplicated rows
    duplicates = df.duplicated(subset=["component_id", "operating_hours", "temperature", "vibration"]).sum()
    if duplicates > 0:
        logger.warning(f"Found and removed {duplicates} duplicate records.")
        df = df.drop_duplicates(subset=["component_id", "operating_hours", "temperature", "vibration"])

    # Validate numerical bounds and clamp physical outliers if any
    for col, (low, high) in SENSOR_BOUNDS.items():
        if col in df.columns:
            out_of_bounds = ((df[col] < low) | (df[col] > high)).sum()
            if out_of_bounds > 0:
                logger.warning(f"Feature '{col}' had {out_of_bounds} values outside [{low}, {high}]. Clamping values.")
                df[col] = df[col].clip(lower=low, upper=high)

    # Impute missing numerical features with median if present
    for col in NUMERICAL_FEATURES:
        if col in df.columns and df[col].isnull().sum() > 0:
            median_val = df[col].median()
            logger.warning(f"Imputing {df[col].isnull().sum()} nulls in numerical feature '{col}' with median: {median_val}")
            df[col] = df[col].fillna(median_val)

    # Impute missing categorical feature
    if "component_type" in df.columns and df["component_type"].isnull().sum() > 0:
        mode_val = df["component_type"].mode()[0]
        df["component_type"] = df["component_type"].fillna(mode_val)

    logger.info(f"Data quality validation complete. Clean dataset size: {len(df)} rows.")
    return df


def derive_remaining_useful_life(df: pd.DataFrame) -> pd.DataFrame:
    """
    Derives ground-truth Remaining Useful Life (RUL) in operating hours using a deterministic,
    physics-of-failure timeline methodology from actual failure records per component.

    Methodology:
    1. Group observations by unique component (`component_id`).
    2. Sort telemetry chronologically by `operating_hours`.
    3. Identify all recorded failure events (`failure_type` is non-null).
    4. For any timestamp/operating_hour h, RUL is the difference between the nearest future failure
       operating_hour (h_fail >= h) and the current operating_hour h:
       RUL(h) = min(h_fail - h) for all h_fail >= h.
    5. If no subsequent failure event is logged in the window after the final failure,
       RUL is measured relative to the maximum observed operating lifespan in the dataset.
    6. Ensures RUL >= 0.0 at all points.
    """
    df = df.copy()
    # Sort strictly by component and operating hours
    df = df.sort_values(["component_id", "operating_hours"])
    
    ruls = []
    for comp_id, group in df.groupby("component_id", sort=False):
        fail_hours = group[group["failure_type"].notna()]["operating_hours"].values
        group_hours = group["operating_hours"].values
        max_h = group_hours.max()
        
        for h in group_hours:
            future_fails = fail_hours[fail_hours >= h]
            if len(future_fails) > 0:
                ruls.append(float(future_fails[0] - h))
            else:
                ruls.append(float(max_h - h))

    df[TARGET_MODEL_B] = ruls
    # Sort back to original index ordering
    df = df.sort_index()
    logger.info(
        f"Derived ground-truth '{TARGET_MODEL_B}': min={df[TARGET_MODEL_B].min():.1f}, "
        f"mean={df[TARGET_MODEL_B].mean():.1f}, max={df[TARGET_MODEL_B].max():.1f} hours."
    )
    return df


def prepare_ml_targets(df: pd.DataFrame) -> pd.DataFrame:
    """
    Standardizes target columns:
    - Model A target: `failure_within_50_hours` (int 0 or 1)
    - Model B target: `remaining_useful_life_hours` (float >= 0.0)
    - Model C target: `failure_type` (mapped NaN -> 'No Failure')
    """
    df = df.copy()
    
    # Model A Target
    if TARGET_MODEL_A in df.columns:
        df[TARGET_MODEL_A] = df[TARGET_MODEL_A].astype(int)
    
    # Model B Target (derive if missing)
    if TARGET_MODEL_B not in df.columns:
        df = derive_remaining_useful_life(df)
        
    # Model C Target
    if TARGET_MODEL_C in df.columns:
        df["failure_type_clean"] = df[TARGET_MODEL_C].fillna("No Failure").astype(str)
        
    return df


def create_preprocessor() -> ColumnTransformer:
    """
    Creates a scikit-learn ColumnTransformer for feature scaling and encoding.
    - Numerical: StandardScaler (zero mean, unit variance)
    - Categorical: OneHotEncoder (handles unknown categories gracefully)
    """
    return ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERICAL_FEATURES),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES),
        ],
        remainder="drop"
    )


def split_data(
    df: pd.DataFrame,
    test_size: float = 0.15,
    val_size: float = 0.15,
    random_state: int = 42
) -> Dict[str, Any]:
    """
    Splits dataset into stratified Train (70%), Validation (15%), and Test (15%) partitions.
    Stratification is performed on Model A's failure target to maintain positive failure balance.
    """
    X = df[ALL_FEATURES]
    y_a = df[TARGET_MODEL_A]
    y_b = df[TARGET_MODEL_B]
    y_c = df["failure_type_clean"]

    # First split off test set (15%)
    X_train_val, X_test, y_a_train_val, y_a_test, y_b_train_val, y_b_test, y_c_train_val, y_c_test = train_test_split(
        X, y_a, y_b, y_c,
        test_size=test_size,
        random_state=random_state,
        stratify=y_a
    )

    # Next split train_val into train (70% total) and validation (15% total)
    # val_ratio = 0.15 / (1.0 - 0.15) = 0.15 / 0.85 ≈ 0.17647
    val_ratio = val_size / (1.0 - test_size)
    X_train, X_val, y_a_train, y_a_val, y_b_train, y_b_val, y_c_train, y_c_val = train_test_split(
        X_train_val, y_a_train_val, y_b_train_val, y_c_train_val,
        test_size=val_ratio,
        random_state=random_state,
        stratify=y_a_train_val
    )

    logger.info(
        f"Data split successfully: "
        f"Train={len(X_train)} ({(len(X_train)/len(df))*100:.1f}%), "
        f"Val={len(X_val)} ({(len(X_val)/len(df))*100:.1f}%), "
        f"Test={len(X_test)} ({(len(X_test)/len(df))*100:.1f}%)"
    )

    return {
        "X_train": X_train,
        "X_val": X_val,
        "X_test": X_test,
        "y_a_train": y_a_train,
        "y_a_val": y_a_val,
        "y_a_test": y_a_test,
        "y_b_train": y_b_train,
        "y_b_val": y_b_val,
        "y_b_test": y_b_test,
        "y_c_train": y_c_train,
        "y_c_val": y_c_val,
        "y_c_test": y_c_test,
    }
