"""
MissionGuard ML Pipeline - Evaluation & Reporting Module
=========================================================
Loads persisted models from src/ML/Models/, generates comprehensive evaluation
tables, per-class classification metrics, confusion matrices, regression error
distributions, and exports the final evaluation report.
"""

import os
import json
import logging
import joblib
import numpy as np
import pandas as pd

from preprocessing import (
    load_raw_datasets,
    validate_data_quality,
    derive_remaining_useful_life,
    prepare_ml_targets,
    split_data,
    ALL_FEATURES
)
from model_a_failure_probability import evaluate_model_a
from model_b_rul import evaluate_model_b
from model_c_failure_mode import evaluate_model_c

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "Data")
MODELS_DIR = os.path.join(BASE_DIR, "Models")


def run_full_evaluation():
    logger.info("=" * 70)
    logger.info("RUNNING MISSIONGUARD ML MODEL EVALUATION SUITE")
    logger.info("=" * 70)

    # 1. Load and prepare test data
    train_path = os.path.join(DATA_DIR, "training_data.csv")
    maint_path = os.path.join(DATA_DIR, "maintenance_data.csv")
    raw_df, _ = load_raw_datasets(train_path, maint_path)
    clean_df = validate_data_quality(raw_df)
    processed_df = derive_remaining_useful_life(clean_df)
    processed_df = prepare_ml_targets(processed_df)

    splits = split_data(processed_df, test_size=0.15, val_size=0.15, random_state=42)
    X_test = splits["X_test"]
    y_a_test = splits["y_a_test"]
    y_b_test = splits["y_b_test"]
    y_c_test = splits["y_c_test"]

    # 2. Load Persisted Artifacts
    preprocessor = joblib.load(os.path.join(MODELS_DIR, "sensor_feature_preprocessor.joblib"))
    model_a = joblib.load(os.path.join(MODELS_DIR, "failure_probability_model.joblib"))
    model_b = joblib.load(os.path.join(MODELS_DIR, "rul_model.joblib"))
    model_c = joblib.load(os.path.join(MODELS_DIR, "failure_mode_model.joblib"))
    label_encoder_c = joblib.load(os.path.join(MODELS_DIR, "failure_mode_label_encoder.joblib"))

    X_test_trans = preprocessor.transform(X_test)

    # 3. Evaluate Model A
    metrics_a = evaluate_model_a(model_a, X_test_trans, y_a_test, dataset_name="Test (Held-Out)")
    print("\n" + "=" * 60)
    print("MODEL A: FAILURE PROBABILITY (TEST EVALUATION)")
    print("=" * 60)
    print(f"Precision:        {metrics_a['precision']:.4f}")
    print(f"Recall:           {metrics_a['recall']:.4f}")
    print(f"F1-Score:         {metrics_a['f1_score']:.4f}")
    print(f"ROC-AUC:          {metrics_a['roc_auc']:.4f}")
    print(f"Confusion Matrix: {metrics_a['confusion_matrix']}")

    # 4. Evaluate Model B
    metrics_b = evaluate_model_b(model_b, X_test_trans, y_b_test, dataset_name="Test (Held-Out)")
    print("\n" + "=" * 60)
    print("MODEL B: REMAINING USEFUL LIFE (TEST EVALUATION)")
    print("=" * 60)
    print(f"Mean Absolute Error (MAE): {metrics_b['mae_hours']:.2f} hours")
    print(f"Root Mean Squared (RMSE):  {metrics_b['rmse_hours']:.2f} hours")
    print(f"R² Score:                  {metrics_b['r2_score']:.4f}")

    # 5. Evaluate Model C
    metrics_c = evaluate_model_c(model_c, label_encoder_c, X_test_trans, y_c_test, dataset_name="Test (Held-Out)")
    print("\n" + "=" * 60)
    print("MODEL C: FAILURE MODE (TEST EVALUATION)")
    print("=" * 60)
    print(f"Weighted Precision: {metrics_c['precision_weighted']:.4f}")
    print(f"Weighted Recall:    {metrics_c['recall_weighted']:.4f}")
    print(f"Weighted F1-Score:  {metrics_c['f1_score_weighted']:.4f}")
    print(f"Macro F1-Score:     {metrics_c['f1_score_macro']:.4f}")
    print("\nPer-Class Breakdown:")
    for cls_name, cls_metrics in metrics_c["classification_report"].items():
        if isinstance(cls_metrics, dict):
            print(
                f"  - {cls_name:16s} | Prec: {cls_metrics['precision']:.4f} | "
                f"Rec: {cls_metrics['recall']:.4f} | F1: {cls_metrics['f1-score']:.4f} | Support: {cls_metrics['support']}"
            )

    # 6. Export Results
    final_results = {
        "model_a_failure_probability": metrics_a,
        "model_b_remaining_useful_life": metrics_b,
        "model_c_failure_mode": metrics_c,
    }
    results_path = os.path.join(MODELS_DIR, "evaluation_results.json")
    with open(results_path, "w", encoding="utf-8") as f:
        json.dump(final_results, f, indent=2)

    logger.info(f"Evaluation report saved to: {results_path}")
    return final_results


if __name__ == "__main__":
    run_full_evaluation()
