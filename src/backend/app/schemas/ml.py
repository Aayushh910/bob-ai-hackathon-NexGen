from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field

class ModelArtifactStatus(BaseModel):
    name: str
    artifact_file: str
    status: str
    model_type: Optional[str] = None
    features_count: Optional[int] = None
    details: Optional[Dict[str, str]] = None

class MLStatusResponse(BaseModel):
    service: str = "SentinelAI ML Inference Engine"
    version: str = "1.0.0"
    all_models_ready: bool
    models: List[ModelArtifactStatus]

class RULResponse(BaseModel):
    asset_id: int
    asset_code: str
    rul_hours: float
    confidence: Optional[float] = None
    telemetry_timestamp: datetime
    model_version: str = "1.0.0"
