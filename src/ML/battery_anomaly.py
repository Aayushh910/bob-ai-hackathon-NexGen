import pickle
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
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
from sklearn.preprocessing import OneHotEncoder, StandardScaler

# 1. Load Dataset
data_path = None
for candidate in [
    Path("Data/battery.csv"),
    Path("../Data/battery.csv"),
    Path("src/ML/Data/battery.csv"),
    Path("C:/Users/Jevil/OneDrive/Desktop/bob/bob-ai-hackathon-NexGen/src/ML/Data/battery.csv"),
]:
    if candidate.exists():
        data_path = candidate
        break

df = pd.read_csv(data_path)
print("Shape of the dataset:", df.shape)

# 2. Target and Feature Preparation (DO NOT use failure_within_50_hours or sensor_status as features)
target = "anomaly_label"
drop_cols = [
    "asset_id", "timestamp", "component_id", "component_type",
    "failure_within_50_hours", "sensor_status", target
]
X = df.drop(columns=[c for c in drop_cols if c in df.columns])
y = df[target]

num_cols = X.select_dtypes(include=["number"]).columns.tolist()
cat_cols = X.select_dtypes(include=["object", "string", "category"]).columns.tolist()

num_transformer = Pipeline([
    ("imputer", SimpleImputer(strategy="median")),
    ("scaler", StandardScaler()),
])
cat_transformer = Pipeline([
    ("imputer", SimpleImputer(strategy="most_frequent")),
    ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
])
transformers = [("num", num_transformer, num_cols)]
if len(cat_cols) > 0:
    transformers.append(("cat", cat_transformer, cat_cols))

preprocessor = ColumnTransformer(
    transformers=transformers,
    verbose_feature_names_out=False,
)

pipeline = Pipeline([
    ("preprocessor", preprocessor),
    ("classifier", RandomForestClassifier(
        n_estimators=300,
        max_depth=16,
        min_samples_split=4,
        min_samples_leaf=2,
        class_weight="balanced_subsample",
        random_state=42,
        n_jobs=-1,
    )),
])

# 3. Train-Test Split (80/20 Stratified)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
pipeline.fit(X_train, y_train)

# 4. Evaluation
y_train_pred = pipeline.predict(X_train)
y_test_pred = pipeline.predict(X_test)
y_test_prob = pipeline.predict_proba(X_test)[:, 1]

print(f"\nTraining Accuracy: {accuracy_score(y_train, y_train_pred):.4f}")
print(f"Testing Accuracy:  {accuracy_score(y_test, y_test_pred):.4f}")
print(f"Precision:         {precision_score(y_test, y_test_pred):.4f}")
print(f"Recall:            {recall_score(y_test, y_test_pred):.4f}")
print(f"F1 Score:          {f1_score(y_test, y_test_pred):.4f}")
print(f"ROC AUC Score:     {roc_auc_score(y_test, y_test_prob):.4f}")

print("\n" + "=" * 70)
print("                     FINAL EVALUATION MATRIX")
print("=" * 70)
print(classification_report(y_test, y_test_pred, target_names=["Normal (0)", "Anomaly (1)"], digits=4))

# 5. Save Pipeline Model
model_dir = None
for candidate in [
    Path("model"),
    Path("../model"),
    Path("src/ML/model"),
    Path("C:/Users/Jevil/OneDrive/Desktop/bob/bob-ai-hackathon-NexGen/src/ML/model"),
]:
    if candidate.exists():
        model_dir = candidate
        break
if model_dir is None:
    model_dir = Path("src/ML/model")
    model_dir.mkdir(parents=True, exist_ok=True)

model_path = model_dir / "battery_anomaly_model.pkl"
with open(model_path, "wb") as f:
    pickle.dump(pipeline, f)
print(f"Saved anomaly model to {model_path}")

# 6. Inference on Test Dataset
test_data_path = None
for candidate in [
    Path("Data/battery_test.csv"),
    Path("../Data/battery_test.csv"),
    Path("src/ML/Data/battery_test.csv"),
    Path("C:/Users/Jevil/OneDrive/Desktop/bob/bob-ai-hackathon-NexGen/src/ML/Data/battery_test.csv"),
]:
    if candidate.exists():
        test_data_path = candidate
        break

if test_data_path is not None:
    df_test = pd.read_csv(test_data_path)
    drop_test_cols = [
        "asset_id", "timestamp", "component_id", "component_type",
        "failure_within_50_hours", "failure_probability_percent",
        "sensor_status",
        "anomaly_label", "anomaly_probability_percent", "anomalies_percentage"
    ]
    X_test_input = df_test.drop(columns=[c for c in drop_test_cols if c in df_test.columns])

    anomaly_prob = pipeline.predict_proba(X_test_input)[:, 1] * 100
    df_test["anomaly_probability_percent"] = anomaly_prob.round(2)
    df_test["anomalies_percentage"] = df_test["anomaly_probability_percent"]
    # 40% threshold rule: if probability > 40%, flag as anomaly (1), else normal (0)
    df_test["anomaly_label"] = (df_test["anomaly_probability_percent"] > 40.0).astype(int)

    df_test.to_csv(test_data_path, index=False)
    print(f"\n[SUCCESS] Successfully written {len(df_test)} rows to '{test_data_path}'")

    # Verifications
    assert set(df_test["anomaly_label"].unique()).issubset({0, 1}), "Invalid values in anomaly_label"
    assert (df_test["anomaly_probability_percent"] >= 0).all() and (df_test["anomaly_probability_percent"] <= 100).all(), "Invalid probability range"
    assert df_test.isnull().sum().sum() == 0, "Missing/null values detected"

    preview_cols = [
        c for c in [
            "asset_id",
            "timestamp",
            "component_id",
            "anomaly_label",
            "anomaly_probability_percent",
            "anomalies_percentage",
            "failure_within_50_hours",
            "failure_probability_percent",
        ] if c in df_test.columns
    ]
    print("\nREQUIRED COLUMNS PREVIEW:")
    print(df_test[preview_cols].head(10))

print(df_test)
