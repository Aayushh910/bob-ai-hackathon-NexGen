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
    df = pd.read_csv("Data/engine.csv")
except Exception:
    try:
        df = pd.read_csv("../Data/engine.csv")
    except Exception:
        df = pd.read_csv(
            "C:/Users/Jevil/OneDrive/Desktop/bob/bob-ai-hackathon-NexGen/src/ML/Data/engine.csv"
        )

print("Shape of the dataset:")
print(df.shape)
print("\nColumn names:")
print(df.columns.tolist())
print("\nData types:")
print(df.dtypes)
print("\nMissing values:")
print(df.isnull().sum())
print("\nClass distribution of the target:")
print(df["failure_within_50_hours"].value_counts())

target = "failure_within_50_hours"
drop_cols = ["asset_id", "timestamp", "component_id", "component_type", target, "anomaly_label"]
X = df.drop(columns=[c for c in drop_cols if c in df.columns])
y = df[target]

num_cols = X.select_dtypes(include=["number"]).columns.tolist()
cat_cols = X.select_dtypes(include=["object", "string", "category"]).columns.tolist()

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

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print("\nNumber of samples:")
print("X_train:", len(X_train))
print("X_test:", len(X_test))
print("y_train:", len(y_train))
print("y_test:", len(y_test))

pipeline.fit(X_train, y_train)

final_feature_names = pipeline.named_steps["preprocessor"].get_feature_names_out()
print("\nFinal feature names used by the model:")
print(list(final_feature_names))

y_train_pred = pipeline.predict(X_train)
y_test_pred = pipeline.predict(X_test)
y_test_prob = pipeline.predict_proba(X_test)[:, 1]

train_acc = accuracy_score(y_train, y_train_pred)
test_acc = accuracy_score(y_test, y_test_pred)
prec = precision_score(y_test, y_test_pred)
rec = recall_score(y_test, y_test_pred)
f1 = f1_score(y_test, y_test_pred)
roc_auc = roc_auc_score(y_test, y_test_prob)

print(f"\nTraining Accuracy: {train_acc:.4f}")
print(f"Testing Accuracy: {test_acc:.4f}")
print(f"Precision: {prec:.4f}")
print(f"Recall: {rec:.4f}")
print(f"F1 Score: {f1:.4f}")

importances = pipeline.named_steps["classifier"].feature_importances_
fi_df = pd.DataFrame(
    {"Feature": final_feature_names, "Importance": importances}
).sort_values(by="Importance", ascending=False).reset_index(drop=True)

print("\nFeature Importance (sorted from highest to lowest):")
print(fi_df.to_string(index=False))

example_sample = X_test.iloc[[0]]
example_pred = pipeline.predict(example_sample)[0]
example_prob = pipeline.predict_proba(example_sample)[0][1]

print("\nExample Prediction:")
print("Predicted Class:", example_pred)
print(f"Failure Probability: {example_prob:.4f}")

model_dir = None
for candidate in [
    Path("model"),
    Path("src/ML/model"),
    Path("../model"),
    Path("C:/Users/Jevil/OneDrive/Desktop/bob/bob-ai-hackathon-NexGen/src/ML/model"),
]:
    if candidate.exists():
        model_dir = candidate
        break
if model_dir is None:
    model_dir = Path("C:/Users/Jevil/OneDrive/Desktop/bob/bob-ai-hackathon-NexGen/src/ML/model")
    model_dir.mkdir(parents=True, exist_ok=True)

model_path = model_dir / "engine_failure_model.pkl"

with open(model_path, "wb") as f:
    pickle.dump(pipeline, f)

print(f"\nSaved model to {model_path}")

with open(model_path, "rb") as f:
    loaded_model = pickle.load(f)

loaded_pred = loaded_model.predict(example_sample)[0]
loaded_prob = loaded_model.predict_proba(example_sample)[0][1]

print("\nLoaded Model Prediction:")
print("Predicted Class:", loaded_pred)
print(f"Failure Probability: {loaded_prob:.4f}")

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

print("\n" + "=" * 70)
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
print(f"  True Negatives  (TN): {tn:>5}  (Correctly identified normal engines)")
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
# 6. INFERENCE ON TEST DATASET (engine_test.csv)
# =====================================================================
test_data_path = None
for candidate in [
    Path("Data/engine_test.csv"),
    Path("../Data/engine_test.csv"),
    Path("src/ML/Data/engine_test.csv"),
    Path("C:/Users/Jevil/OneDrive/Desktop/bob/bob-ai-hackathon-NexGen/src/ML/Data/engine_test.csv"),
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

    try:
        df_test.to_csv(test_data_path, index=False)
        print(f"\n[SUCCESS] Successfully written {len(df_test)} rows to '{test_data_path}'")
    except PermissionError:
        print(f"\n[WARNING] '{test_data_path}' is open in an external application (e.g. Excel). Please close it to overwrite.")

    print(f"Final Shape: {df_test.shape[0]} rows, {df_test.shape[1]} columns")

    # Verifications
    assert set(df_test["failure_within_50_hours"].unique()).issubset({0, 1}), "Invalid values in failure_within_50_hours"
    assert (df_test["failure_probability_percent"] >= 0).all() and (df_test["failure_probability_percent"] <= 100).all(), "Invalid values in failure_probability_percent"
    assert df_test.isnull().sum().sum() == 0, "Missing/null values detected"
    assert len(df_test) == 1003, f"Expected 1003 rows, got {len(df_test)}"

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
