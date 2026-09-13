"""
MissionGuard ML Pipeline - Model B: Remaining Useful Life (RUL) (Regression)
=============================================================================
Predicts the remaining operating hours until component failure based on
telemetry degradation patterns, operational load, and maintenance history.
"""

import os
import json
import logging
from typing import Dict, Any, Tuple, Optional
import numpy as np
import pandas as pd
import joblib

from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score
from xgboost import XGBRegressor

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def get_model_b_candidates(random_state: int = 42) -> Dict[str, Any]:
    """
    Returns candidate regression estimators for Model B (RUL).
    """
    return {
        "Ridge Regression": Ridge(
            alpha=1.0,
            random_state=random_state
        ),
        "Random Forest Regressor": RandomForestRegressor(
            n_estimators=150,
            max_depth=12,
            min_samples_split=5,
            random_state=random_state,
            n_jobs=-1
        ),
        "Gradient Boosting Regressor": GradientBoostingRegressor(
            n_estimators=150,
            max_depth=5,
            learning_rate=0.08,
            random_state=random_state
        ),
        "XGBoost Regressor": XGBRegressor(
            n_estimators=150,
            max_depth=5,
            learning_rate=0.08,
            random_state=random_state,
            n_jobs=-1
        )
    }


def evaluate_model_b(
    model: Any,
    X: np.ndarray,
    y_true: np.ndarray,
    dataset_name: str = "Validation"
) -> Dict[str, Any]:
    """
    Computes MAE, RMSE, and R² for Model B.
    Predictions are bounded to non-negative values.
    """
    y_pred = model.predict(X)
    y_pred = np.clip(y_pred, 0.0, None)

    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(root_mean_squared_error(y_true, y_pred))
    r2 = float(r2_score(y_true, y_pred))

    metrics = {
        "dataset": dataset_name,
        "mae_hours": round(mae, 2),
        "rmse_hours": round(rmse, 2),
        "r2_score": round(r2, 4)
    }
    return metrics


def predict_rul(
    model: Any,
    preprocessor: Any,
    X_raw: pd.DataFrame
) -> Dict[str, Any]:
    """
    Runs inference for Model B:
    Returns remaining_useful_life_hours (float >= 0.0).
    """
    X_trans = preprocessor.transform(X_raw)
    preds = model.predict(X_trans)
    clipped_preds = np.clip(preds, 0.0, None)

    results = []
    for r in clipped_preds:
        results.append({
            "remaining_useful_life_hours": round(float(r), 1)
        })

    return results[0] if len(results) == 1 else results
