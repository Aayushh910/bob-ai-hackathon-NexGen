import pickle
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

# 1. Load Dataset
data_path = None
for candidate in [
    Path("../Data/battery.csv"),
    Path("Data/battery.csv"),
    Path("src/ML/Data/battery.csv"),
    Path("C:/Users/Jevil/OneDrive/Desktop/bob/bob-ai-hackathon-NexGen/src/ML/Data/battery.csv"),
]:
    if candidate.exists():
        data_path = candidate
        break

df = pd.read_csv(data_path)
print("Battery dataset successfully loaded into pandas DataFrame.")
print("=" * 60)
print("DATASET SHAPE:")
print(f"Rows: {df.shape[0]}, Columns: {df.shape[1]}")
print("=" * 60)

# 2. Target and Feature Preparation (Excluding sensor_status and anomaly_label)
target = "failure_within_50_hours"
drop_cols = [
    "asset_id", "timestamp", "component_id", "component_type",
    target, "sensor_status", "anomaly_label"
]
X = df.drop(columns=[c for c in drop_cols if c in df.columns])
y = df[target]

num_cols = X.select_dtypes(include=["number"]).columns.tolist()
print(f"Selected Numerical Features ({len(num_cols)}):\n{num_cols}\n")

preprocessor = ColumnTransformer(
    transformers=[
        ("num", Pipeline([("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]), num_cols)
    ],
    verbose_feature_names_out=False,
)

# 3. Fine-Tuned Gradient Boosted Decision Trees Pipeline
pipeline = Pipeline([
    ("preprocessor", preprocessor),
    ("classifier", XGBClassifier(
        learning_rate=0.02,
        max_depth=4,
        subsample=0.95,
        colsample_bytree=0.8,
        n_estimators=300,
        random_state=42,
        n_jobs=-1,
        eval_metric="logloss"
    )),
])

# 4. Stratified Train-Test Split (80/20)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
pipeline.fit(X_train, y_train)

final_feature_names = pipeline.named_steps["preprocessor"].get_feature_names_out()
print("Model training complete.")
print(f"\nFinal feature names used by the model ({len(final_feature_names)}):\n{list(final_feature_names)}")

# 5. Feature Importance Analysis
importances = pipeline.named_steps["classifier"].feature_importances_
fi_df = pd.DataFrame({"Feature": final_feature_names, "Importance": importances}).sort_values(by="Importance", ascending=False).reset_index(drop=True)
print("=" * 60)
print("FEATURE IMPORTANCES (Highest to Lowest):")
print("=" * 60)
print(fi_df.to_string(index=False))

# 6. Evaluation
y_train_pred = pipeline.predict(X_train)
y_test_pred = pipeline.predict(X_test)
y_test_prob = pipeline.predict_proba(X_test)[:, 1]

train_acc = accuracy_score(y_train, y_train_pred)
test_acc = accuracy_score(y_test, y_test_pred)
prec = precision_score(y_test, y_test_pred)
rec = recall_score(y_test, y_test_pred)
f1 = f1_score(y_test, y_test_pred)
roc_auc = roc_auc_score(y_test, y_test_prob)

print("=" * 60)
print("MODEL EVALUATION METRICS SUMMARY:")
print("=" * 60)
print(f"  Training Accuracy:  {train_acc:.4f} ({train_acc*100:.2f}%)")
print(f"  Testing Accuracy:   {test_acc:.4f} ({test_acc*100:.2f}%)")
print(f"  Precision:          {prec:.4f} ({prec*100:.2f}%)")
print(f"  Recall:             {rec:.4f} ({rec*100:.2f}%)")
print(f"  F1 Score:           {f1:.4f}")
print(f"  ROC-AUC Score:      {roc_auc:.4f}")
print("=" * 60)

# 7. Final Evaluation Matrix
cm = confusion_matrix(y_test, y_test_pred)
tn, fp, fn, tp = cm.ravel()
cm_df = pd.DataFrame(cm, index=["Actual Normal (0)", "Actual Failure (1)"], columns=["Predicted Normal (0)", "Predicted Failure (1)"])
cm_norm = (confusion_matrix(y_test, y_test_pred, normalize="true") * 100).round(2)
cm_norm_df = pd.DataFrame(cm_norm, index=["Actual Normal (0)", "Actual Failure (1)"], columns=["Predicted Normal (%)", "Predicted Failure (%)"])

print("\n" + "=" * 70)
print("                     FINAL EVALUATION MATRIX")
print("=" * 70)
print("\n1. CONFUSION MATRIX (Sample Counts):\n" + "-" * 50)
print(cm_df)
print("\n2. CONFUSION MATRIX (Normalized Class-wise %):\n" + "-" * 50)
print(cm_norm_df)
print("\n3. FULL CLASSIFICATION REPORT:\n" + "-" * 70)
print(classification_report(y_test, y_test_pred, target_names=["Normal (0)", "Failure (1)"], digits=4))
print("=" * 70)

# 8. Save Pipeline Model
model_dir = None
for candidate in [
    Path("../model"),
    Path("model"),
    Path("src/ML/model"),
    Path("C:/Users/Jevil/OneDrive/Desktop/bob/bob-ai-hackathon-NexGen/src/ML/model"),
]:
    if candidate.exists():
        model_dir = candidate
        break
if model_dir is None:
    model_dir = Path("src/ML/model")
    model_dir.mkdir(parents=True, exist_ok=True)

model_path = model_dir / "battery_failure_model.pkl"
with open(model_path, "wb") as f:
    pickle.dump(pipeline, f)
print(f"\nModel and preprocessing pipeline saved successfully to:\n  {model_path}")

# 9. Inference on Test Dataset (battery_test.csv)
test_data_path = None
for candidate in [
    Path("../Data/battery_test.csv"),
    Path("Data/battery_test.csv"),
    Path("src/ML/Data/battery_test.csv"),
    Path("C:/Users/Jevil/OneDrive/Desktop/bob/bob-ai-hackathon-NexGen/src/ML/Data/battery_test.csv"),
]:
    if candidate.exists():
        test_data_path = candidate
        break

if test_data_path is not None:
    df_test = pd.read_csv(test_data_path)
    print("=" * 70)
    print(f"Loaded Test Dataset from: {test_data_path}")
    print(f"Initial Shape: {df_test.shape[0]} rows, {df_test.shape[1]} columns")
    print("=" * 70)

    drop_test_cols = [
        "asset_id", "timestamp", "component_id", "component_type",
        "failure_within_50_hours", "failure_probability_percent",
        "sensor_status", "anomaly_label", "anomaly_probability_percent", "anomalies_percentage"
    ]
    X_test_input = df_test.drop(columns=[c for c in drop_test_cols if c in df_test.columns])
    print(f"\nFeatures passed into pipeline for prediction:\n{X_test_input.columns.tolist()}")

    failure_probability = pipeline.predict_proba(X_test_input)[:, 1] * 100
    df_test["failure_probability_percent"] = failure_probability.round(2)
    df_test["failure_within_50_hours"] = (df_test["failure_probability_percent"] > 40.0).astype(int)

    df_test.to_csv(test_data_path, index=False)
    print(f"\n[SUCCESS] Successfully written {len(df_test)} rows to '{test_data_path}'")
    print(f"Final Shape: {df_test.shape[0]} rows, {df_test.shape[1]} columns")

    assert set(df_test["failure_within_50_hours"].unique()).issubset({0, 1})
    assert (df_test["failure_probability_percent"] >= 0).all() and (df_test["failure_probability_percent"] <= 100).all()
    assert df_test.isnull().sum().sum() == 0
    assert len(df_test) == 1017

    preview_cols = ["asset_id", "timestamp", "component_id", "failure_within_50_hours", "failure_probability_percent"]
    print("\nREQUIRED COLUMNS PREVIEW:")
    print(df_test[preview_cols].head(10))
