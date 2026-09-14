from app.schemas.asset import AssetCreate, AssetUpdate, AssetResponse
from app.schemas.sensor import SensorReadingCreate, SensorReadingResponse
from app.schemas.maintenance import MaintenanceRecordCreate, MaintenanceRecordResponse
from app.schemas.prediction import PredictionResponse
from app.schemas.anomaly import AnomalyResponse
from app.schemas.recommendation import RecommendationResponse

__all__ = [
    "AssetCreate",
    "AssetUpdate",
    "AssetResponse",
    "SensorReadingCreate",
    "SensorReadingResponse",
    "MaintenanceRecordCreate",
    "MaintenanceRecordResponse",
    "PredictionResponse",
    "AnomalyResponse",
    "RecommendationResponse",
]
