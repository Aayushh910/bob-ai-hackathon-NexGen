from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

class AnomalyBase(BaseModel):
    asset_id: int
    sensor_reading_id: Optional[int] = None
    anomaly_score: float = Field(..., ge=0.0, le=1.0, description="Anomaly probability / score")
    severity: str = Field(..., description="Severity: NORMAL, LOW, MEDIUM, HIGH, CRITICAL")
    affected_sensor: Optional[str] = Field(None, description="Attributed sensor(s) causing anomaly")
    explanation: Optional[str] = Field(None, description="Explanatory text or sigma deviation details")
    model_version: Optional[str] = Field("1.0.0", description="Model version tag")

class AnomalyCreate(AnomalyBase):
    pass

class AnomalyResponse(AnomalyBase):
    id: int
    detected_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AnomalyListResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[AnomalyResponse]

class SensorAttribution(BaseModel):
    sensor: str
    value: float
    baseline_mean: float
    baseline_std: float
    sigma_deviation: float
    is_anomaly_cause: bool

class AnomalyRunResponse(BaseModel):
    asset_id: int
    asset_code: str
    is_anomaly: bool
    anomaly_score: float
    threshold: float
    severity: str
    telemetry_timestamp_used: datetime
    attributed_sensors: List[SensorAttribution]
    persisted_anomaly_id: Optional[int] = None
    message: str
