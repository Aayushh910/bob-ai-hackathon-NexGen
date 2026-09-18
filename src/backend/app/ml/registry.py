import logging
import os
import pickle
import warnings
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from sklearn.exceptions import InconsistentVersionWarning
warnings.filterwarnings("ignore", category=InconsistentVersionWarning)

logger = logging.getLogger("sentinelai.ml.registry")

def _resolve_ml_models_dir() -> Path:
    """Discovers the 8 trained ML models directory across repo structures."""
    env_dir = os.environ.get("ML_MODELS_DIR")
    if env_dir and Path(env_dir).exists():
        return Path(env_dir)

    base = Path(__file__).resolve()
    candidates = [
        base.parent.parent.parent.parent / "ML" / "model",
        base.parent.parent.parent.parent / "src" / "ML" / "model",
        base.parent.parent.parent / "ML" / "model",
        base.parent.parent.parent / "src" / "ML" / "model",
        Path.cwd() / "src" / "ML" / "model",
        Path.cwd() / "ML" / "model",
        Path("d:/bob-ai-hackathon-NexGen/src/ML/model"),
    ]
    for cand in candidates:
        if cand.exists() and (cand / "engine_anomaly_model.pkl").exists():
            return cand

    return base.parent.parent.parent.parent / "src" / "ML" / "model"

ML_MODELS_DIR = _resolve_ml_models_dir()

# Canonical Component Types and Model Filenames mapping
MODEL_FILENAMES: Dict[Tuple[str, str], str] = {
    ("Engine", "anomaly"): "engine_anomaly_model.pkl",
    ("Engine", "failure"): "engine_failure_model.pkl",
    ("Battery", "anomaly"): "battery_anomaly_model.pkl",
    ("Battery", "failure"): "battery_failure_model.pkl",
    ("Fuel Pump", "anomaly"): "fuel_pump_anomaly_model.pkl",
    ("Fuel Pump", "failure"): "fuel_pump_failure_model.pkl",
    ("Hydraulic System", "anomaly"): "hydraulic_system_anomaly_model.pkl",
    ("Hydraulic System", "failure"): "hydraulic_system_failure_model.pkl",
}

# Alias mapping for component type normalization
COMPONENT_TYPE_ALIASES = {
    "engine": "Engine",
    "eng": "Engine",
    "battery": "Battery",
    "bat": "Battery",
    "fuel pump": "Fuel Pump",
    "fuel_pump": "Fuel Pump",
    "pmp": "Fuel Pump",
    "hydraulic system": "Hydraulic System",
    "hydraulic_system": "Hydraulic System",
    "hydraulic": "Hydraulic System",
    "hyd": "Hydraulic System",
}

class ModelRegistry:
    """
    Thread-safe, lazy-loading model registry caching all 8 component-specific
    anomaly and failure ML models.
    """
    _instance: Optional["ModelRegistry"] = None

    def __init__(self, models_dir: Optional[Path] = None):
        self.models_dir = Path(models_dir or ML_MODELS_DIR)
        self._models: Dict[Tuple[str, str], Any] = {}
        self._load_status: Dict[Tuple[str, str], bool] = {}
        self._load_errors: Dict[Tuple[str, str], str] = {}
        logger.info(f"ModelRegistry initialized with directory: {self.models_dir}")

    @classmethod
    def get_instance(cls) -> "ModelRegistry":
        if cls._instance is None:
            cls._instance = ModelRegistry()
        return cls._instance

    @staticmethod
    def normalize_component_type(comp_type: str) -> str:
        """Normalizes variations of component type names to canonical values."""
        clean = comp_type.strip()
        lower = clean.lower()
        if lower in COMPONENT_TYPE_ALIASES:
            return COMPONENT_TYPE_ALIASES[lower]
        return clean

    def get_model(self, component_type: str, prediction_type: str) -> Any:
        """
        Retrieves and caches the requested ML model.
        prediction_type: 'anomaly' or 'failure'.
        """
        norm_type = self.normalize_component_type(component_type)
        pred_type = prediction_type.strip().lower()

        key = (norm_type, pred_type)
        if key not in MODEL_FILENAMES:
            raise ValueError(
                f"Unknown model request: component_type='{component_type}', prediction_type='{prediction_type}'. "
                f"Valid combinations: {list(MODEL_FILENAMES.keys())}"
            )

        if key in self._models:
            return self._models[key]

        filename = MODEL_FILENAMES[key]
        file_path = self.models_dir / filename

        if not file_path.exists():
            err = f"Trained model artifact missing at {file_path}"
            self._load_status[key] = False
            self._load_errors[key] = err
            logger.error(err)
            raise FileNotFoundError(err)

        try:
            with open(file_path, "rb") as f:
                model = pickle.load(f)
            self._models[key] = model
            self._load_status[key] = True
            logger.info(f"Successfully loaded and cached model '{filename}' for ({norm_type}, {pred_type})")
            return model
        except Exception as e:
            self._load_status[key] = False
            self._load_errors[key] = str(e)
            logger.error(f"Failed to deserialize model '{filename}': {e}", exc_info=True)
            raise RuntimeError(f"Error loading model '{filename}': {e}") from e

    def load_all(self) -> Dict[str, bool]:
        """Pre-loads and validates all 8 models."""
        results = {}
        for (ctype, ptype) in MODEL_FILENAMES:
            fname = MODEL_FILENAMES[(ctype, ptype)]
            try:
                self.get_model(ctype, ptype)
                results[f"{ctype} {ptype} ({fname})"] = True
            except Exception as e:
                results[f"{ctype} {ptype} ({fname})"] = False
                logger.error(f"Preload failed for {fname}: {e}")
        return results

    def get_status_overview(self) -> Dict[str, Any]:
        """Returns observable health and readiness status for all 8 models."""
        overview = []
        all_ready = True
        for (ctype, ptype), fname in MODEL_FILENAMES.items():
            key = (ctype, ptype)
            is_loaded = self._load_status.get(key, False)
            if not is_loaded:
                # Try loading once
                try:
                    self.get_model(ctype, ptype)
                    is_loaded = True
                except Exception:
                    is_loaded = False
                    all_ready = False

            model = self._models.get(key)
            overview.append({
                "component_type": ctype,
                "prediction_type": ptype,
                "artifact_file": fname,
                "status": "READY" if is_loaded else "UNAVAILABLE",
                "model_class": str(type(model).__name__) if model else None,
                "error": self._load_errors.get(key, "")
            })

        return {
            "total_models": len(MODEL_FILENAMES),
            "all_models_ready": all_ready,
            "models": overview
        }

model_registry = ModelRegistry.get_instance()
