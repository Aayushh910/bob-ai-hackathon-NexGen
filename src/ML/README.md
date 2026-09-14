# 🛡️ MissionGuard - Machine Learning Modeling Pipeline

This directory contains the production-grade Machine Learning pipeline for the **MissionGuard** Mission Readiness & Predictive Maintenance Copilot.

---

## 📋 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Dataset & Target Formulations](#dataset--target-formulations)
3. [Features & Data Schema](#features--data-schema)
4. [Data Quality & Leakage Prevention](#data-quality--leakage-prevention)
5. [Candidate Algorithms & Selection Methodology](#candidate-algorithms--selection-methodology)
6. [Empirical Evaluation Results](#empirical-evaluation-results)
7. [Unified Multi-Model Inference Interface](#unified-multi-model-inference-interface)
8. [Directory Structure](#directory-structure)
9. [How to Run](#how-to-run)

---

## 1. Architecture Overview

MissionGuard employs a unified three-model predictive hierarchy to assess component health and readiness:

```
                  Incoming Sensor & Telemetry Payload
                                  │
                                  ▼
                     [Data Preprocessor & Scaler]
                     (StandardScaler + OneHotEncoder)
                                  │
       ┌──────────────────────────┼──────────────────────────┐
       │                          │                          │
       ▼                          ▼                          ▼
 ┌───────────────┐        ┌───────────────┐        ┌──────────────────┐
 │    MODEL A    │        │    MODEL B    │        │     MODEL C      │
 │    Failure    │        │   Remaining   │        │   Failure Mode   │
 │  Probability  │        │  Useful Life  │        │   (Multiclass)   │
 │   & Risk      │        │     (RUL)     │        │                  │
 └───────┬───────┘        └───────┬───────┘        └────────┬─────────┘
         │                        │                         │
         │                        │                         │
         └────────────────────────┼─────────────────────────┘
                                  ▼
                   Unified JSON Prediction Payload
                   (Consumed by FastAPI Backend)
```

---

## 2. Dataset & Target Formulations

The ML pipeline operates strictly on the verified datasets:
- **`src/ML/Data/training_data.csv`** (20,000 telemetry records across 50 assets and 200 components)
- **`src/ML/Data/maintenance_data.csv`** (300 maintenance log events)

### Model Formulations:

| Model | Objective | Algorithm Family | Target Column | Target Details |
|---|---|---|---|---|
| **Model A** | Predict failure likelihood within next 50 operating hours | Binary Classification | `failure_within_50_hours` | `0` (Nominal), `1` (Failure within 50 hrs) |
| **Model B** | Predict remaining operating lifespan | Regression | `remaining_useful_life_hours` | Continuous float ($\ge 0.0$ hours), derived from actual component failure points |
| **Model C** | Diagnose root-cause failure mode | Multiclass Classification | `failure_type` | 6 Classes: `No Failure`, `Pressure Drop`, `Tool Wear`, `Overstrain`, `Electrical`, `Overheating` |

### RUL Derivation Methodology (Model B):
For each component trajectory sorted chronologically by `operating_hours` ($h$), the ground-truth RUL is deterministically computed as:
$$\text{RUL}(c, h) = \min \{ h_{\text{fail}} - h \mid h_{\text{fail}} \ge h, \, \text{failure\_type is not null} \}$$
If no subsequent failure occurs in the observation window, RUL is measured relative to the maximum observed operating lifespan.

---

## 3. Features & Data Schema

Each model consumes 21 operational features (1 categorical and 20 numerical):

### Categorical Feature (1):
- `component_type` (One-Hot Encoded: `Battery`, `Engine`, `Fuel Pump`, `Hydraulic System`)

### Numerical & Sensor Features (20):
1. `temperature` (Sensor reading, °C)
2. `vibration` (Sensor reading, mm/s)
3. `oil_pressure` (Sensor reading, psi)
4. `fuel_pressure` (Sensor reading, psi)
5. `rpm` (Rotational speed)
6. `hydraulic_pressure` (Sensor reading, psi)
7. `battery_voltage` (Sensor reading, Volts)
8. `coolant_temperature` (Sensor reading, °C)
9. `operating_hours` (Cumulative service time)
10. `load_percentage` (Current operational load, %)
11. `ambient_temperature` (Ambient environment temperature, °C)
12. `temperature_change` ($\Delta$ Temperature)
13. `vibration_change` ($\Delta$ Vibration)
14. `oil_pressure_change` ($\Delta$ Oil Pressure)
15. `rolling_temperature_mean` (Rolling window mean temperature)
16. `rolling_vibration_mean` (Rolling window mean vibration)
17. `rolling_pressure_mean` (Rolling window mean pressure)
18. `previous_failures` (Historical count of past component failures)
19. `hours_since_last_maintenance` (Operating hours since last service)
20. `anomaly_label` (Real-time telemetry anomaly indicator: `0` or `1`)

---

## 4. Data Quality & Leakage Prevention

### Preprocessing Protocol:
1. **Missing Values**: Numerical nulls are imputed using column medians computed on the training split; categorical nulls are mode-imputed.
2. **Physical Boundary Validation**: Values are clamped to plausible physical engineering limits.
3. **Partitioning**: Stratified split into **Train (70%, 14,000 rows)**, **Validation (15%, 3,000 rows)**, and **Test (15%, 3,000 rows)**.
4. **Preprocessor Fitting**: `ColumnTransformer` (StandardScaler + OneHotEncoder) is fit strictly on `X_train` to prevent distribution leakage into validation and test sets.

### Data Leakage Audit:
To guarantee real-world predictive validity, the following target-derived and future-dated columns are strictly excluded from input feature matrices:
- `failure_within_50_hours` (Model A Target)
- `remaining_useful_life_hours` (Model B Target)
- `failure_type` / `failure_type_clean` (Model C Target)
- `failure_occurred` (Maintenance record outcome)
- `parts_replaced` (Post-maintenance repair data)
- `maintenance_duration_hours` (Post-maintenance duration)
- `next_maintenance_due_hours` (Future maintenance scheduling)
- `component_condition` & `issue_detected` (Post-inspection notes)

---

## 5. Candidate Algorithms & Selection Methodology

Candidate models across linear, tree ensemble, and gradient boosted families were trained and validated:

### Model A: Failure Probability Candidates
- **Logistic Regression (Balanced)**: F1 = 0.6069, ROC-AUC = **0.7761**, Recall = 0.7098 *(Selected)*
- **Random Forest Classifier**: F1 = 0.5955, ROC-AUC = 0.7717, Recall = 0.6670
- **Gradient Boosting Classifier**: F1 = 0.5476, ROC-AUC = 0.7691, Recall = 0.4888
- **XGBoost Classifier**: F1 = 0.5783, ROC-AUC = 0.7689, Recall = 0.5906

### Model B: Remaining Useful Life (RUL) Candidates
- **Ridge Regression**: MAE = 32.05 hrs, RMSE = 46.48 hrs, $R^2$ = 0.3356
- **Random Forest Regressor**: MAE = 26.18 hrs, RMSE = 40.39 hrs, $R^2$ = 0.4981
- **Gradient Boosting Regressor**: MAE = **26.33 hrs**, RMSE = **40.17 hrs**, $R^2$ = **0.5036** *(Selected)*
- **XGBoost Regressor**: MAE = 26.36 hrs, RMSE = 40.23 hrs, $R^2$ = 0.5021

### Model C: Failure Mode Candidates
- **Multinomial Logistic Regression**: Weighted F1 = 0.9164, Macro F1 = 0.7645
- **Random Forest (Multiclass)**: Weighted F1 = 0.9970, Macro F1 = 0.9877
- **Gradient Boosting (Multiclass)**: Weighted F1 = **0.9993**, Macro F1 = **0.9983** *(Selected)*
- **XGBoost (Multiclass)**: Weighted F1 = 0.9949, Macro F1 = 0.9760

---

## 6. Empirical Evaluation Results (Held-Out Test Set: 3,000 records)

### Model A (Failure Probability)
- **Selected Model**: Balanced Logistic Regression
- **Precision**: 0.5245
- **Recall**: 0.6986
- **F1-Score**: 0.5991
- **ROC-AUC**: **0.7640**
- **Confusion Matrix**: `[[1396, 622], [296, 686]]`

### Model B (Remaining Useful Life)
- **Selected Model**: Gradient Boosting Regressor
- **Mean Absolute Error (MAE)**: **25.71 hours**
- **Root Mean Squared Error (RMSE)**: **39.07 hours**
- **Coefficient of Determination ($R^2$)**: **0.5104**

### Model C (Failure Mode Multiclass)
- **Selected Model**: Gradient Boosting Multiclass Classifier
- **Weighted Precision**: **0.9987**
- **Weighted Recall**: **0.9987**
- **Weighted F1-Score**: **0.9987**
- **Macro F1-Score**: **0.9937**

#### Per-Class Breakdown (Test Set):
| Failure Class | Precision | Recall | F1-Score | Support |
|---|---|---|---|---|
| **Electrical** | 0.9839 | 0.9531 | 0.9683 | 64 |
| **No Failure** | 0.9988 | 1.0000 | 0.9994 | 2,448 |
| **Overheating** | 1.0000 | 1.0000 | 1.0000 | 34 |
| **Overstrain** | 1.0000 | 0.9894 | 0.9947 | 94 |
| **Pressure Drop** | 1.0000 | 1.0000 | 1.0000 | 181 |
| **Tool Wear** | 1.0000 | 1.0000 | 1.0000 | 179 |

---

## 7. Unified Multi-Model Inference Interface

`predict.py` provides the single unified inference endpoint for MissionGuard:

```python
from predict import predict

telemetry_payload = {
    "asset_id": "A001",
    "component_type": "Battery",
    "temperature": 71.03,
    "vibration": 2.82,
    "oil_pressure": 74.40,
    "fuel_pressure": 55.44,
    "rpm": 1810.5,
    "hydraulic_pressure": 150.8,
    "battery_voltage": 24.3,
    "coolant_temperature": 75.5,
    "operating_hours": 277.0,
    "load_percentage": 62.2,
    "ambient_temperature": 30.3,
    "temperature_change": 0.0,
    "vibration_change": 0.0,
    "oil_pressure_change": 0.0,
    "rolling_temperature_mean": 71.03,
    "rolling_vibration_mean": 2.82,
    "rolling_pressure_mean": 74.40,
    "previous_failures": 0,
    "hours_since_last_maintenance": 0,
    "anomaly_label": 0
}

result = predict(telemetry_payload)
print(result)
```

### Output JSON Format:
```json
{
  "asset_id": "A001",
  "component_type": "Battery",
  "failure_prediction": {
    "failure_probability": 0.2064,
    "failure_risk": "LOW"
  },
  "remaining_useful_life": {
    "hours": 74.1
  },
  "failure_mode": {
    "predicted_failure_mode": "No Failure",
    "confidence": 1.0
  }
}
```

---

## 8. Directory Structure

```
src/ML/
├── Data/
│   ├── training_data.csv                   # Raw training telemetry (20,000 rows)
│   ├── maintenance_data.csv                # Historical maintenance logs (300 rows)
│   └── sensor_data.csv                     # Raw sensor telemetry
├── Models/
│   ├── failure_probability_model.joblib    # Serialized Model A
│   ├── rul_model.joblib                    # Serialized Model B
│   ├── failure_mode_model.joblib           # Serialized Model C
│   ├── sensor_feature_preprocessor.joblib  # Serialized ColumnTransformer
│   ├── failure_mode_label_encoder.joblib   # Serialized LabelEncoder
│   ├── model_metadata.json                 # Training & candidate metadata
│   └── evaluation_results.json             # Test set metrics & confusion matrices
├── preprocessing.py                        # Ingestion, RUL derivation, splitting
├── feature_engineering.py                  # Schema contracts & leakage auditor
├── model_a_failure_probability.py          # Model A candidate training & scoring
├── model_b_rul.py                          # Model B candidate training & scoring
├── model_c_failure_mode.py                 # Model C candidate training & scoring
├── train.py                                # End-to-end training orchestrator
├── evaluate.py                             # Test evaluation & reporting suite
├── predict.py                              # Unified prediction engine
└── README.md                               # Complete pipeline documentation
```

---

## 9. How to Run

### 1. Train & Select Models:
```bash
python src/ML/train.py
```

### 2. Run Comprehensive Test Evaluation:
```bash
python src/ML/evaluate.py
```

### 3. Run Inference Demonstration:
```bash
python src/ML/predict.py
```

---

## 10. Scope & Known Limitations

- **Single Fleet / Platform Type Calibration**:
  Due to ML model architecture complexity, divergent physical telemetry operating baselines, and limited multi-platform failure datasets, the current models (`Model A`, `Model B`, and `Model C`) are specifically trained and calibrated for a single fleet type (tactical aircraft/combat vehicle platform). Adapting the pipeline to disparate asset classes (e.g., naval craft, multi-engine heavy transports) requires custom telemetry schema engineering, bespoke degradation curves, and retraining on platform-specific sensor feeds.
- **Predictive Scope**: Designed for progressive mechanical wear and fatigue trends; cannot predict sudden, non-telemetric battle trauma or external kinetic events.
- **Offline Batch Retraining**: Model scoring occurs in real-time in FastAPI memory via `ModelRegistry`, while model training and hyperparameter updates operate as an offline batch workflow.

