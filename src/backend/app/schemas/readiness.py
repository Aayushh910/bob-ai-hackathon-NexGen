from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.recommendation import RecommendationResponse

class RiskFactor(BaseModel):
    factor_type: str = Field(..., description="FAILURE_RISK, ANOMALY, LOW_RUL, FAILURE_MODE, TELEMETRY_WARNING, MAINTENANCE_STATUS")
    severity: str = Field(..., description="LOW, MEDIUM, HIGH, CRITICAL")
    title: str
    explanation: str
    source: str
    affected_component_or_sensor: Optional[str] = None
    supporting_value: Optional[str] = None
    timestamp: Optional[datetime] = None

class ContributingFactor(BaseModel):
    name: str
    score_impact: float
    reason: str

class ReadinessAssessmentResponse(BaseModel):
    id: int
    asset_id: int
    asset_code: Optional[str] = None
    asset_type: Optional[str] = None
    model: Optional[str] = None
    location: Optional[str] = None
    operational_status: Optional[str] = None
    readiness_state: str = Field(..., description="READY, CAUTION, DEGRADED, NOT_READY")
    readiness_score: float = Field(..., ge=0.0, le=100.0)
    risk_level: str = Field(..., description="LOW, MEDIUM, HIGH, CRITICAL")
    failure_probability: Optional[float] = None
    rul_hours: Optional[float] = None
    predicted_failure_mode: Optional[str] = None
    is_anomaly: bool = False
    primary_reason: str
    contributing_factors: List[ContributingFactor] = []
    risk_factors: List[RiskFactor] = []
    recommendations: List[RecommendationResponse] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class FleetReadinessItem(BaseModel):
    asset_id: int
    asset_code: str
    asset_type: str
    model: str
    location: str
    operational_status: str
    readiness_state: str
    readiness_score: float
    risk_level: str
    failure_probability: Optional[float] = None
    rul_hours: Optional[float] = None
    is_anomaly: bool = False
    predicted_failure_mode: Optional[str] = None
    primary_reason: str
    last_assessed: datetime
    open_recommendations_count: int = 0

    model_config = ConfigDict(from_attributes=True)

class FleetReadinessSummary(BaseModel):
    total_assets: int
    ready_count: int
    caution_count: int
    degraded_count: int
    not_ready_count: int
    critical_risk_count: int
    active_anomalies_count: int
    average_readiness_score: float

class FleetReadinessListResponse(BaseModel):
    total: int
    page: int
    size: int
    summary: FleetReadinessSummary
    items: List[FleetReadinessItem]

class AttentionQueueItem(BaseModel):
    asset_id: int
    asset_code: str
    asset_type: str
    model: str
    location: str
    readiness_state: str
    risk_level: str
    readiness_score: float
    urgency_rank: int
    primary_trigger: str
    critical_factor: Optional[str] = None
    recommended_action: Optional[str] = None
