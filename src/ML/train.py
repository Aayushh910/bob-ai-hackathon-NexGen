"""
MissionGuard ML Pipeline - Main Training & Selection Orchestrator
==================================================================
Executes the end-to-end ML pipeline:
1. Ingestion & Quality Validation
2. Ground-truth RUL Derivation
3. Data Leakage Auditing
4. Stratified Train / Validation / Test Splitting (70% / 15% / 15%)
5. Feature Preprocessing (fit on Train only)
6. Candidate Model Training & Benchmarking for Models A, B, and C
7. Best Model Selection & Test Set Verification
8. Artifact Persistence to src/ML/Models/
"""

import os
import sys
import json
import logging
import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder

# Local imports
from preprocessing import (
    load_raw_datasets,
    validate_data_quality,
    derive_remaining_useful_life,
    prepare_ml_targets,
    create_preprocessor,
    split_data,
    ALL_FEATURES
)
from feature_engineering import audit_features_for_leakage
from model_a_failure_probability import get_model_a_candidates, evaluate_model_a
from model_b_rul import get_model_b_candidates, evaluate_model_b
from model_c_failure_mode import get_model_c_candidates, evaluate_model_c

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Output directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "Data")
MODELS_DIR = os.path.join(BASE_DIR, "Models")
os.makedirs(MODELS_DIR, exist_ok=True)


def run_training_pipeline():
    logger.info("=" * 70)
    logger.info("STARTING MISSIONGUARD ML TRAINING & SELECTION PIPELINE")
    logger.info("=" * 70)

    # 1. Load Data
    train_path = os.path.join(DATA_DIR, "training_data.csv")
    maint_path = os.path.join(DATA_DIR, "maintenance_data.csv")
    raw_df, maint_df = load_raw_datasets(train_path, maint_path)

    # 2. Data Validation & Cleaning
    clean_df = validate_data_quality(raw_df)

    # 3. Ground Truth RUL Derivation & Target Preparation
    processed_df = derive_remaining_useful_life(clean_df)
    processed_df = prepare_ml_targets(processed_df)

    # 4. Data Leakage Verification
    audit_features_for_leakage(processed_df[ALL_FEATURES])
    logger.info("Strict data leakage audit PASSED. No target or future features in input matrix.")

    # 5. Stratified Train / Validation / Test Partition (70% / 15% / 15%)
    splits = split_data(processed_df, test_size=0.15, val_size=0.15, random_state=42)
    X_train = splits["X_train"]
    X_val = splits["X_val"]
    X_test = splits["X_test"]

    # 6. Fit Preprocessor ONLY on Training Set
    preprocessor = create_preprocessor()
    X_train_trans = preprocessor.fit_transform(X_train)
    X_val_trans = preprocessor.transform(X_val)
    X_test_trans = preprocessor.transform(X_test)
    logger.info("Preprocessor fit on X_train only and transformed train, val, and test partitions.")

    # Label Encoder for Model C
    label_encoder_c = LabelEncoder()
    y_c_train_encoded = label_encoder_c.fit_transform(splits["y_c_train"])
    y_c_val_encoded = label_encoder_c.transform(splits["y_c_val"])
    y_c_test_encoded = label_encoder_c.transform(splits["y_c_test"])

    # -------------------------------------------------------------------------
    # MODEL A: FAILURE PROBABILITY
    # -------------------------------------------------------------------------
    logger.info("\n" + "=" * 50)
    logger.info("TRAINING CANDIDATES: MODEL A (Failure Probability)")
    logger.info("=" * 50)
    candidates_a = get_model_a_candidates()
    results_a = {}
    best_a_name = None
    best_a_score = -1.0

    for name, clf in candidates_a.items():
        logger.info(f"Training Model A Candidate: {name}...")
        clf.fit(X_train_trans, splits["y_a_train"])
        val_metrics = evaluate_model_a(clf, X_val_trans, splits["y_a_val"], dataset_name="Validation")
        results_a[name] = val_metrics
        logger.info(
            f"  -> {name} | F1: {val_metrics['f1_score']:.4f} | "
            f"ROC-AUC: {val_metrics['roc_auc']:.4f} | Prec: {val_metrics['precision']:.4f} | Rec: {val_metrics['recall']:.4f}"
        )
        # Selection criterion: ROC-AUC + F1
        score = val_metrics["roc_auc"] + val_metrics["f1_score"]
        if score > best_a_score:
            best_a_score = score
            best_a_name = name

    best_model_a = candidates_a[best_a_name]
    test_metrics_a = evaluate_model_a(best_model_a, X_test_trans, splits["y_a_test"], dataset_name="Test")
    logger.info(f"SELECTED BEST MODEL A: {best_a_name}")
    logger.info(
        f"  Test Performance -> F1: {test_metrics_a['f1_score']:.4f} | "
        f"ROC-AUC: {test_metrics_a['roc_auc']:.4f} | Precision: {test_metrics_a['precision']:.4f} | Recall: {test_metrics_a['recall']:.4f}"
    )

    # -------------------------------------------------------------------------
    # MODEL B: REMAINING USEFUL LIFE (RUL)
    # -------------------------------------------------------------------------
    logger.info("\n" + "=" * 50)
    logger.info("TRAINING CANDIDATES: MODEL B (Remaining Useful Life)")
    logger.info("=" * 50)
    candidates_b = get_model_b_candidates()
    results_b = {}
    best_b_name = None
    best_b_score = float("inf")

    for name, reg in candidates_b.items():
        logger.info(f"Training Model B Candidate: {name}...")
        reg.fit(X_train_trans, splits["y_b_train"])
        val_metrics = evaluate_model_b(reg, X_val_trans, splits["y_b_val"], dataset_name="Validation")
        results_b[name] = val_metrics
        logger.info(
            f"  -> {name} | MAE: {val_metrics['mae_hours']:.2f} hrs | "
            f"RMSE: {val_metrics['rmse_hours']:.2f} hrs | R2: {val_metrics['r2_score']:.4f}"
        )
        # Selection criterion: Minimum RMSE
        if val_metrics["rmse_hours"] < best_b_score:
            best_b_score = val_metrics["rmse_hours"]
            best_b_name = name

    best_model_b = candidates_b[best_b_name]
    test_metrics_b = evaluate_model_b(best_model_b, X_test_trans, splits["y_b_test"], dataset_name="Test")
    logger.info(f"SELECTED BEST MODEL B: {best_b_name}")
    logger.info(
        f"  Test Performance -> MAE: {test_metrics_b['mae_hours']:.2f} hrs | "
        f"RMSE: {test_metrics_b['rmse_hours']:.2f} hrs | R2: {test_metrics_b['r2_score']:.4f}"
    )

    # -------------------------------------------------------------------------
    # MODEL C: FAILURE MODE
    # -------------------------------------------------------------------------
    logger.info("\n" + "=" * 50)
    logger.info("TRAINING CANDIDATES: MODEL C (Failure Mode Multiclass)")
    logger.info("=" * 50)
    candidates_c = get_model_c_candidates()
    results_c = {}
    best_c_name = None
    best_c_score = -1.0

    for name, clf in candidates_c.items():
        logger.info(f"Training Model C Candidate: {name}...")
        clf.fit(X_train_trans, y_c_train_encoded)
        val_metrics = evaluate_model_c(clf, label_encoder_c, X_val_trans, splits["y_c_val"], dataset_name="Validation")
        results_c[name] = val_metrics
        logger.info(
            f"  -> {name} | F1(Weighted): {val_metrics['f1_score_weighted']:.4f} | "
            f"F1(Macro): {val_metrics['f1_score_macro']:.4f} | Prec(Weighted): {val_metrics['precision_weighted']:.4f}"
        )
        # Selection criterion: F1 Macro + F1 Weighted
        score = val_metrics["f1_score_macro"] + val_metrics["f1_score_weighted"]
        if score > best_c_score:
            best_c_score = score
            best_c_name = name

    best_model_c = candidates_c[best_c_name]
    test_metrics_c = evaluate_model_c(best_model_c, label_encoder_c, X_test_trans, splits["y_c_test"], dataset_name="Test")
    logger.info(f"SELECTED BEST MODEL C: {best_c_name}")
    logger.info(
        f"  Test Performance -> F1(Weighted): {test_metrics_c['f1_score_weighted']:.4f} | "
        f"F1(Macro): {test_metrics_c['f1_score_macro']:.4f} | Prec(Weighted): {test_metrics_c['precision_weighted']:.4f}"
    )

    # -------------------------------------------------------------------------
    # PERSIST ARTIFACTS
    # -------------------------------------------------------------------------
    logger.info("\n" + "=" * 50)
    logger.info("PERSISTING TRAINED MODELS & METADATA")
    logger.info("=" * 50)

    # Save models and preprocessors
    joblib.dump(best_model_a, os.path.join(MODELS_DIR, "failure_probability_model.joblib"))
    joblib.dump(best_model_b, os.path.join(MODELS_DIR, "rul_model.joblib"))
    joblib.dump(best_model_c, os.path.join(MODELS_DIR, "failure_mode_model.joblib"))
    joblib.dump(preprocessor, os.path.join(MODELS_DIR, "sensor_feature_preprocessor.joblib"))
    joblib.dump(label_encoder_c, os.path.join(MODELS_DIR, "failure_mode_label_encoder.joblib"))

    # Save complete evaluation report & metadata
    metadata = {
        "models": {
            "model_a_failure_probability": {
                "algorithm": best_a_name,
                "target": "failure_within_50_hours",
                "validation_metrics": results_a[best_a_name],
                "test_metrics": test_metrics_a
            },
            "model_b_rul": {
                "algorithm": best_b_name,
                "target": "remaining_useful_life_hours",
                "validation_metrics": results_b[best_b_name],
                "test_metrics": test_metrics_b
            },
            "model_c_failure_mode": {
                "algorithm": best_c_name,
                "target": "failure_type",
                "classes": list(label_encoder_c.classes_),
                "validation_metrics": results_c[best_c_name],
                "test_metrics": test_metrics_c
            }
        },
        "candidate_comparisons": {
            "model_a_candidates": results_a,
            "model_b_candidates": results_b,
            "model_c_candidates": results_c
        },
        "feature_schema": {
            "canonical_features": ALL_FEATURES,
            "feature_count": len(ALL_FEATURES)
        },
        "dataset_summary": {
            "total_records": len(processed_df),
            "train_records": len(X_train),
            "val_records": len(X_val),
            "test_records": len(X_test)
        }
    }

    metadata_path = os.path.join(MODELS_DIR, "model_metadata.json")
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    logger.info(f"Artifacts successfully saved to: {MODELS_DIR}")
    logger.info("Training pipeline completed successfully.")
    return metadata


if __name__ == "__main__":
    run_training_pipeline()
