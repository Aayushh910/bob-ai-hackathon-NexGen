"""
MissionGuard ML Pipeline - Model A: Failure Probability (Binary Classification)
================================================================================
Predicts the probability that an asset/component will experience a failure
within the next 50 operating hours, and maps it to actionable failure risk categories.
"""

import os
import json
import logging
from typing import Dict, Any, Tuple, Optional
import numpy as np
import pandas as pd
import joblib

from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report
)
from xgboost import XGBClassifier

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def map_probability_to_risk(prob: float) -> str:
    """
    Maps failure probability (0.0 - 1.0) to operational risk category:
    - [0.00, 0.30) -> LOW
    - [0.30, 0.60) -> MEDIUM
    - [0.60, 0.85) -> HIGH
    - [0.85, 1.00] -> CRITICAL
    """
    if prob < 0.30:
        return "LOW"
    elif prob < 0.60:
        return "MEDIUM"
    elif prob < 0.85:
        return "HIGH"
    else:
        return "CRITICAL"


def get_model_a_candidates(random_state: int = 42) -> Dict[str, Any]:
    """
    Returns candidate binary classification estimators for Model A.
    """
    return {
        "Logistic Regression": LogisticRegression(
            max_iter=1000,
            class_weight="balanced",
            random_state=random_state
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=150,
            max_depth=12,
            min_samples_split=5,
            class_weight="balanced",
            random_state=random_state,
            n_jobs=-1
        ),
        "Gradient Boosting": GradientBoostingClassifier(
            n_estimators=150,
            max_depth=5,
            learning_rate=0.08,
            random_state=random_state
        ),
        "XGBoost": XGBClassifier(
            n_estimators=150,
            max_depth=5,
            learning_rate=0.08,
            scale_pos_weight=1.5,
            eval_metric="logloss",
            random_state=random_state,
            n_jobs=-1
        )
    }


def evaluate_model_a(
    model: Any,
    X: np.ndarray,
    y_true: np.ndarray,
    dataset_name: str = "Validation"
) -> Dict[str, Any]:
    """
    Computes Precision, Recall, F1-Score, ROC-AUC, and Confusion Matrix for Model A.
    """
    y_pred = model.predict(X)
    y_prob = model.predict_proba(X)[:, 1]

    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    auc = float(roc_auc_score(y_true, y_prob))
    cm = confusion_matrix(y_true, y_pred).tolist()
    report = classification_report(y_true, y_pred, output_dict=True, zero_division=0)

    metrics = {
        "dataset": dataset_name,
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(auc, 4),
        "confusion_matrix": cm,
        "classification_report": report
    }
    return metrics


def predict_failure_probability(
    model: Any,
    preprocessor: Any,
    X_raw: pd.DataFrame
) -> Dict[str, Any]:
    """
    Runs inference for Model A:
    Returns failure_probability and failure_risk.
    """
    X_trans = preprocessor.transform(X_raw)
    probs = model.predict_proba(X_trans)[:, 1]

    results = []
    for p in probs:
        p_val = float(np.clip(p, 0.0, 1.0))
        risk = map_probability_to_risk(p_val)
        results.append({
            "failure_probability": round(p_val, 4),
            "failure_risk": risk
        })

    return results[0] if len(results) == 1 else results
