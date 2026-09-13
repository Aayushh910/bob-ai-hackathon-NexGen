from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

class PredictionBase(BaseModel):
    asset_id: int
    prediction_type: str = Field("UNIFIED_INFERENCE", description="Type: UNIFIED_INFERENCE, FAILURE_PROBABILITY, RUL, FAILURE_MODE")
    failure_probability: Optional[float] = Field(None, ge=0.0, le=1.0, description="Estimated failure probability (0.0 - 1.0)")
    predicted_failure: bool = Field(False, description="Whether failure is predicted within 50 hours")
    risk_level: Optional[str] = Field(None, description="Risk classification: LOW, MEDIUM, HIGH")
    rul_hours: Optional[float] = Field(None, ge=0.0, description="Estimated remaining useful life in hours")
    predicted_failure_mode: Optional[str] = Field(None, description="Diagnosed failure mode")
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0, description="Model confidence score")
    model_version: str = Field("1.0.0", description="Model version tag")

class PredictionCreate(PredictionBase):
    pass

class PredictionResponse(PredictionBase):
    id: int
    prediction_timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

class PredictionListResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[PredictionResponse]

class PredictionRunResponse(BaseModel):
    asset_id: int
    asset_code: str
    prediction: PredictionResponse
    telemetry_timestamp_used: datetime
    message: str
