"""
MissionGuard ML Pipeline - Model C: Failure Mode (Multiclass Classification)
=============================================================================
Predicts the specific failure mode (e.g., Pressure Drop, Tool Wear, Overstrain,
Electrical, Overheating, or No Failure) and reports prediction confidence.
"""

import os
import json
import logging
from typing import Dict, Any, Tuple, Optional, List
import numpy as np
import pandas as pd
import joblib

from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report
)
from xgboost import XGBClassifier

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def get_model_c_candidates(random_state: int = 42) -> Dict[str, Any]:
    """
    Returns candidate multiclass classification estimators for Model C.
    """
    return {
        "Logistic Regression (Multinomial)": LogisticRegression(
            max_iter=1000,
            class_weight="balanced",
            random_state=random_state
        ),
        "Random Forest (Multiclass)": RandomForestClassifier(
            n_estimators=150,
            max_depth=12,
            min_samples_split=5,
            class_weight="balanced",
            random_state=random_state,
            n_jobs=-1
        ),
        "Gradient Boosting (Multiclass)": GradientBoostingClassifier(
            n_estimators=150,
            max_depth=5,
            learning_rate=0.08,
            random_state=random_state
        ),
        "XGBoost (Multiclass)": XGBClassifier(
            n_estimators=150,
            max_depth=5,
            learning_rate=0.08,
            eval_metric="mlogloss",
            random_state=random_state,
            n_jobs=-1
        )
    }


def evaluate_model_c(
    model: Any,
    label_encoder: LabelEncoder,
    X: np.ndarray,
    y_true_labels: np.ndarray,
    dataset_name: str = "Validation"
) -> Dict[str, Any]:
    """
    Computes Precision, Recall, F1-Score (macro and weighted), Confusion Matrix,
    and per-class metrics for Model C.
    """
    y_true_encoded = label_encoder.transform(y_true_labels)
    y_pred_encoded = model.predict(X)
    y_pred_labels = label_encoder.inverse_transform(y_pred_encoded)

    prec_weighted = float(precision_score(y_true_encoded, y_pred_encoded, average="weighted", zero_division=0))
    rec_weighted = float(recall_score(y_true_encoded, y_pred_encoded, average="weighted", zero_division=0))
    f1_weighted = float(f1_score(y_true_encoded, y_pred_encoded, average="weighted", zero_division=0))

    prec_macro = float(precision_score(y_true_encoded, y_pred_encoded, average="macro", zero_division=0))
    rec_macro = float(recall_score(y_true_encoded, y_pred_encoded, average="macro", zero_division=0))
    f1_macro = float(f1_score(y_true_encoded, y_pred_encoded, average="macro", zero_division=0))

    cm = confusion_matrix(y_true_labels, y_pred_labels, labels=label_encoder.classes_).tolist()
    report = classification_report(y_true_labels, y_pred_labels, output_dict=True, zero_division=0)

    metrics = {
        "dataset": dataset_name,
        "classes": list(label_encoder.classes_),
        "precision_weighted": round(prec_weighted, 4),
        "recall_weighted": round(rec_weighted, 4),
        "f1_score_weighted": round(f1_weighted, 4),
        "precision_macro": round(prec_macro, 4),
        "recall_macro": round(rec_macro, 4),
        "f1_score_macro": round(f1_macro, 4),
        "confusion_matrix": cm,
        "classification_report": report
    }
    return metrics


def predict_failure_mode(
    model: Any,
    preprocessor: Any,
    label_encoder: LabelEncoder,
    X_raw: pd.DataFrame
) -> Dict[str, Any]:
    """
    Runs inference for Model C:
    Returns predicted_failure_mode and confidence.
    """
    X_trans = preprocessor.transform(X_raw)
    probs = model.predict_proba(X_trans)
    pred_indices = np.argmax(probs, axis=1)
    pred_labels = label_encoder.inverse_transform(pred_indices)

    results = []
    for i, label in enumerate(pred_labels):
        conf = float(probs[i, pred_indices[i]])
        results.append({
            "predicted_failure_mode": str(label),
            "confidence": round(conf, 4)
        })

    return results[0] if len(results) == 1 else results
