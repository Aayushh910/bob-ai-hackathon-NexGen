import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
import joblib

import os

logger = logging.getLogger("sentinelai.ml.registry")

def _resolve_ml_models_dir() -> Path:
    """Discovers the ML Models directory across various deployment layouts."""
    env_dir = os.environ.get("ML_MODELS_DIR")
    if env_dir and Path(env_dir).exists():
        return Path(env_dir)

    base = Path(__file__).resolve()
    candidates = [
        base.parent.parent.parent.parent / "ML" / "Models",       # src/ML/Models
        base.parent.parent.parent.parent / "src" / "ML" / "Models",
        base.parent.parent.parent / "ML" / "Models",
        Path.cwd() / "ML" / "Models",
        Path.cwd() / "src" / "ML" / "Models",
        base.parent / "models",
    ]
    for cand in candidates:
        if cand.exists() and (cand / "anomaly_config.json").exists():
            return cand

    return base.parent.parent.parent.parent / "ML" / "Models"

ML_MODELS_DIR = _resolve_ml_models_dir()

class ModelRegistry:
    """
    Thread-safe, lazy-loading singleton model registry for SentinelAI.
    Caches all serialized scikit-learn models, scalers, encoders, and configs
    in memory to avoid disk I/O per inference request.
    """
    _instance: Optional["ModelRegistry"] = None

    def __init__(self, models_dir: Optional[Path] = None):
        self.models_dir = models_dir or ML_MODELS_DIR
        self._artifacts: Dict[str, Any] = {}
        self._load_status: Dict[str, bool] = {}
        self._load_errors: Dict[str, str] = {}
        self._initialize_registry()

    @classmethod
    def get_instance(cls) -> "ModelRegistry":
        if cls._instance is None:
            cls._instance = ModelRegistry()
        return cls._instance

    def _load_joblib_artifact(self, key: str, filename: str):
        file_path = self.models_dir / filename
        if not file_path.exists():
            self._load_status[key] = False
            self._load_errors[key] = f"Artifact missing at {file_path}"
            logger.warning(f"ML artifact not found: {file_path}")
            return None

        try:
            artifact = joblib.load(str(file_path))
            self._artifacts[key] = artifact
            self._load_status[key] = True
            logger.info(f"Loaded ML artifact '{key}' from {filename}")
            return artifact
        except Exception as e:
            self._load_status[key] = False
            self._load_errors[key] = str(e)
            logger.error(f"Failed to load ML artifact '{key}': {e}", exc_info=True)
            return None

    def _load_json_artifact(self, key: str, filename: str):
        file_path = self.models_dir / filename
        if not file_path.exists():
            self._load_status[key] = False
            self._load_errors[key] = f"Config missing at {file_path}"
            logger.warning(f"ML config not found: {file_path}")
            return None

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self._artifacts[key] = data
            self._load_status[key] = True
            logger.info(f"Loaded ML config '{key}' from {filename}")
            return data
        except Exception as e:
            self._load_status[key] = False
            self._load_errors[key] = str(e)
            logger.error(f"Failed to load ML config '{key}': {e}", exc_info=True)
            return None

    def _initialize_registry(self):
        logger.info(f"Initializing ModelRegistry from directory: {self.models_dir}")
        # 1. Anomaly detection artifacts
        self._load_joblib_artifact("anomaly_rf", "anomaly_random_forest.joblib")
        self._load_joblib_artifact("sensor_scaler", "sensor_scaler.joblib")
        self._load_json_artifact("anomaly_config", "anomaly_config.json")
        self._load_joblib_artifact("anomaly_if", "anomaly_isolation_forest.joblib")

        # 2. Unified predictive maintenance models
        self._load_joblib_artifact("preprocessor", "sensor_feature_preprocessor.joblib")
        self._load_joblib_artifact("model_a_failure_prob", "failure_probability_model.joblib")
        self._load_joblib_artifact("model_b_rul", "rul_model.joblib")
        self._load_joblib_artifact("model_c_failure_mode", "failure_mode_model.joblib")
        self._load_joblib_artifact("failure_mode_encoder", "failure_mode_label_encoder.joblib")

    # Getters
    def get_anomaly_rf(self):
        return self._artifacts.get("anomaly_rf")

    def get_sensor_scaler(self):
        return self._artifacts.get("sensor_scaler")

    def get_anomaly_config(self) -> Dict[str, Any]:
        return self._artifacts.get("anomaly_config", {})

    def get_anomaly_if(self):
        return self._artifacts.get("anomaly_if")

    def get_preprocessor(self):
        return self._artifacts.get("preprocessor")

    def get_model_a(self):
        return self._artifacts.get("model_a_failure_prob")

    def get_model_b(self):
        return self._artifacts.get("model_b_rul")

    def get_model_c(self):
        return self._artifacts.get("model_c_failure_mode")

    def get_failure_mode_encoder(self):
        return self._artifacts.get("failure_mode_encoder")

    def get_status_overview(self) -> Dict[str, Any]:
        """Returns observable health and readiness status for all registered models."""
        models_info: List[Dict[str, Any]] = []

        definitions = [
            ("Anomaly Detection (Random Forest)", "anomaly_rf", "anomaly_random_forest.joblib", "Supervised RF Anomaly Classifier"),
            ("Sensor Scaler", "sensor_scaler", "sensor_scaler.joblib", "StandardScaler (11 Features)"),
            ("Anomaly Configuration", "anomaly_config", "anomaly_config.json", "Thresholds & Baseline Gaussian Stats"),
            ("Anomaly Detection (Isolation Forest)", "anomaly_if", "anomaly_isolation_forest.joblib", "Unsupervised Outlier Detector"),
            ("Sensor Feature Preprocessor", "preprocessor", "sensor_feature_preprocessor.joblib", "ColumnTransformer (21 Features)"),
            ("Model A — Failure Probability", "model_a_failure_prob", "failure_probability_model.joblib", "LogisticRegression (50-hr Failure Risk)"),
            ("Model B — Remaining Useful Life", "model_b_rul", "rul_model.joblib", "GradientBoostingRegressor (Hours)"),
            ("Model C — Failure Mode Diagnosis", "model_c_failure_mode", "failure_mode_model.joblib", "GradientBoostingClassifier (6 Classes)"),
            ("Failure Mode Label Encoder", "failure_mode_encoder", "failure_mode_label_encoder.joblib", "LabelEncoder (Failure Types)"),
        ]

        all_ready = True
        for name, key, filename, desc in definitions:
            is_loaded = self._load_status.get(key, False)
            if not is_loaded:
                all_ready = False

            artifact = self._artifacts.get(key)
            models_info.append({
                "name": name,
                "artifact_file": filename,
                "status": "READY" if is_loaded else "UNAVAILABLE",
                "model_type": str(type(artifact).__name__) if artifact else None,
                "details": {
                    "description": desc,
                    "error": self._load_errors.get(key, "")
                }
            })

        return {
            "service": "SentinelAI ML Inference Engine",
            "version": "1.0.0",
            "all_models_ready": all_ready,
            "models": models_info
        }

model_registry = ModelRegistry.get_instance()
