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
try:
    df = pd.read_csv("../Data/battery.csv")
except Exception:
    try:
        df = pd.read_csv("Data/battery.csv")
    except Exception:
        try:
            df = pd.read_csv("src/ML/Data/battery.csv")
        except Exception:
            df = pd.read_csv(
                "C:/Users/Jevil/OneDrive/Desktop/bob/bob-ai-hackathon-NexGen/src/ML/Data/battery.csv"
            )

print("Battery dataset successfully loaded into pandas DataFrame.")
print("=" * 60)
print("DATASET SHAPE:")
print(f"Rows: {df.shape[0]}, Columns: {df.shape[1]}")
print("=" * 60)

print("\nCOLUMN NAMES:")
for i, col in enumerate(df.columns, 1):
    print(f"  {i:2d}. {col}")

print("\n" + "=" * 60)
print("DATA TYPES:")
print(df.dtypes)

print("\n" + "=" * 60)
print("MISSING VALUES:")
missing = df.isnull().sum()
print(missing)
print(f"\nTotal Missing Values across dataset: {missing.sum()}")

print("\n" + "=" * 60)
print("CLASS DISTRIBUTION OF TARGET (failure_within_50_hours):")
target_counts = df["failure_within_50_hours"].value_counts()
target_pct = df["failure_within_50_hours"].value_counts(normalize=True) * 100
dist_df = pd.DataFrame({"Count": target_counts, "Percentage (%)": target_pct.round(2)})
dist_df.index = ["Normal (0)", "Failure within 50h (1)"]
print(dist_df)

print("\n" + "=" * 60)
print("SUMMARY STATISTICS FOR NUMERICAL FEATURES:")
print(df.describe().T[["mean", "std", "min", "25%", "50%", "75%", "max"]].round(2))
target = "failure_within_50_hours"
drop_cols = ["asset_id", "timestamp", "component_id", "component_type", target, "anomaly_label"]

X = df.drop(columns=[c for c in drop_cols if c in df.columns])
y = df[target]

num_cols = X.select_dtypes(include=["number"]).columns.tolist()
cat_cols = X.select_dtypes(include=["object", "string", "category"]).columns.tolist()

print(f"Selected Numerical Features ({len(num_cols)}):\n{num_cols}\n")
print(f"Selected Categorical Features ({len(cat_cols)}):\n{cat_cols}\n")

num_transformer = Pipeline(
    [
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ]
)

cat_transformer = Pipeline(
    [
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ]
)

preprocessor = ColumnTransformer(
    transformers=[
        ("num", num_transformer, num_cols),
        ("cat", cat_transformer, cat_cols),
    ],
    verbose_feature_names_out=False,
)
print("Preprocessing pipeline with feature scaling configured.")
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print("=" * 60)
print("DATASET SPLIT SUMMARY:")
print(f"  Total samples:  {len(df)}")
print(f"  X_train samples: {len(X_train)} ({len(X_train)/len(df)*100:.1f}%)")
print(f"  X_test samples:  {len(X_test)} ({len(X_test)/len(df)*100:.1f}%)")
print(f"  y_train samples: {len(y_train)} ({len(y_train)/len(df)*100:.1f}%)")
print(f"  y_test samples:  {len(y_test)} ({len(y_test)/len(df)*100:.1f}%)")
print("=" * 60)
pipeline = Pipeline(
    [
        ("preprocessor", preprocessor),
        (
            "classifier",
            RandomForestClassifier(
                n_estimators=300,
                max_depth=16,
                min_samples_split=4,
                min_samples_leaf=2,
                class_weight="balanced_subsample",
                random_state=42,
                n_jobs=-1,
            ),
        ),
    ]
)

pipeline.fit(X_train, y_train)

final_feature_names = pipeline.named_steps["preprocessor"].get_feature_names_out()
print("Model training complete.")
print(f"\nFinal feature names used by the model ({len(final_feature_names)}):\n{list(final_feature_names)}")
importances = pipeline.named_steps["classifier"].feature_importances_
fi_df = pd.DataFrame(
    {"Feature": final_feature_names, "Importance": importances}
).sort_values(by="Importance", ascending=False).reset_index(drop=True)

print("=" * 60)
print("FEATURE IMPORTANCES (Highest to Lowest):")
print("=" * 60)
print(fi_df.to_string(index=False))
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
example_sample = X_test.iloc[[0]]
example_pred = pipeline.predict(example_sample)[0]
example_prob = pipeline.predict_proba(example_sample)[0]

print("=" * 60)
print("EXAMPLE PREDICTION ON RAW SENSOR INPUT:")
print("=" * 60)
print("Input Sample Values:")
for k, v in example_sample.to_dict(orient="records")[0].items():
    print(f"  {k:22s}: {v}")
print("-" * 60)
print(f"Predicted Class: {example_pred} ('{'Failure' if example_pred == 1 else 'Normal'}')")
print(f"Normal Probability:  {example_prob[0]:.4f} ({example_prob[0]*100:.2f}%)")
print(f"Failure Probability: {example_prob[1]:.4f} ({example_prob[1]*100:.2f}%)")
print("=" * 60)
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
    model_dir = Path("C:/Users/Jevil/OneDrive/Desktop/bob/bob-ai-hackathon-NexGen/src/ML/model")
    model_dir.mkdir(parents=True, exist_ok=True)

model_path = model_dir / "battery_failure_model.pkl"

with open(model_path, "wb") as f:
    pickle.dump(pipeline, f)

print(f"Model and preprocessing pipeline saved successfully to:\n  {model_path}")

with open(model_path, "rb") as f:
    loaded_pipeline = pickle.load(f)

test_pred = loaded_pipeline.predict(example_sample)[0]
test_prob = loaded_pipeline.predict_proba(example_sample)[0][1]
print("\nLoaded Model Verification from Pickle:")
print(f"  Verified Predicted Class:      {test_pred}")
print(f"  Verified Failure Probability:  {test_prob:.4f}")
cm = confusion_matrix(y_test, y_test_pred)
tn, fp, fn, tp = cm.ravel()

cm_df = pd.DataFrame(
    cm,
    index=["Actual Normal (0)", "Actual Failure (1)"],
    columns=["Predicted Normal (0)", "Predicted Failure (1)"],
)

cm_norm = confusion_matrix(y_test, y_test_pred, normalize="true") * 100
cm_norm_df = pd.DataFrame(
    cm_norm.round(2),
    index=["Actual Normal (0)", "Actual Failure (1)"],
    columns=["Predicted Normal (%)", "Predicted Failure (%)"],
)

specificity = tn / (tn + fp)
npv = tn / (tn + fn)
mcc = ((tp * tn) - (fp * fn)) / np.sqrt(float((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn)))

print("=" * 70)
print("                     FINAL EVALUATION MATRIX")
print("=" * 70)

print("\n1. CONFUSION MATRIX (Sample Counts):")
print("-" * 50)
print(cm_df)

print("\n2. CONFUSION MATRIX (Normalized Class-wise %):")
print("-" * 50)
print(cm_norm_df)

print("\n3. MATRIX BREAKDOWN:")
print("-" * 50)
print(f"  True Negatives  (TN): {tn:>5}  (Correctly identified normal batterys)")
print(f"  False Positives (FP): {fp:>5}  (False alarms - normal flagged as failure)")
print(f"  False Negatives (FN): {fn:>5}  (Missed failures - failure flagged as normal)")
print(f"  True Positives  (TP): {tp:>5}  (Correctly identified failures)")

print("\n4. EXTENDED DIAGNOSTIC METRICS:")
print("-" * 50)
print(f"  Accuracy:             {test_acc:.4f} ({test_acc*100:.2f}%)")
print(f"  Sensitivity (Recall): {rec:.4f} ({rec*100:.2f}%)")
print(f"  Specificity:          {specificity:.4f} ({specificity*100:.2f}%)")
print(f"  Precision (PPV):      {prec:.4f} ({prec*100:.2f}%)")
print(f"  Negative Pred Value:  {npv:.4f} ({npv*100:.2f}%)")
print(f"  F1 Score:             {f1:.4f}")
print(f"  ROC AUC Score:        {roc_auc:.4f}")
print(f"  Matthews Corr Coef:   {mcc:.4f}")

print("\n5. FULL CLASSIFICATION REPORT:")
print("-" * 70)
print(classification_report(y_test, y_test_pred, target_names=["Normal (0)", "Failure (1)"], digits=4))
print("=" * 70)

# =====================================================================
# 6. INFERENCE ON TEST DATASET (battery_test.csv)
# =====================================================================
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
    print("\n" + "=" * 70)
    print(f"Loaded Test Dataset from: {test_data_path}")
    print(f"Initial Shape: {df_test.shape[0]} rows, {df_test.shape[1]} columns")
    print("=" * 70)

    drop_test_cols = ["asset_id", "timestamp", "component_id", "component_type", "failure_within_50_hours", "failure_probability_percent"]
    X_test_input = df_test.drop(columns=[c for c in drop_test_cols if c in df_test.columns])

    failure_probability = pipeline.predict_proba(X_test_input)[:, 1] * 100

    # If probability is above 40%, flag as failure (1), else normal (0)
    df_test["failure_probability_percent"] = failure_probability.round(2)
    df_test["failure_within_50_hours"] = (df_test["failure_probability_percent"] > 40.0).astype(int)

    df_test.to_csv(test_data_path, index=False)
    print(f"\n[SUCCESS] Successfully written {len(df_test)} rows to '{test_data_path}'")
    print(f"Final Shape: {df_test.shape[0]} rows, {df_test.shape[1]} columns")

    # Verifications
    assert set(df_test["failure_within_50_hours"].unique()).issubset({0, 1}), "Invalid values in failure_within_50_hours"
    assert (df_test["failure_probability_percent"] >= 0).all() and (df_test["failure_probability_percent"] <= 100).all(), "Invalid values in failure_probability_percent"
    assert df_test.isnull().sum().sum() == 0, "Missing/null values detected"
    assert len(df_test) == 1017, f"Expected 1017 rows, got {len(df_test)}"

    counts = df_test["failure_within_50_hours"].value_counts()
    pcts = df_test["failure_within_50_hours"].value_counts(normalize=True) * 100
    summary_table = pd.DataFrame({"Count": counts, "Percentage (%)": pcts.round(2)})
    summary_table.index = ["Failure within 50h (1)" if idx == 1 else "Normal (0)" for idx in summary_table.index]
    print("\nTEST SET PREDICTION SUMMARY (Threshold: > 40% -> Failure):")
    print(summary_table)

    preview_cols = [
        "asset_id",
        "timestamp",
        "component_id",
        "failure_within_50_hours",
        "failure_probability_percent",
    ]
    print("\nREQUIRED COLUMNS PREVIEW:")
    print(df_test[preview_cols].head(10))

print(df_test)
