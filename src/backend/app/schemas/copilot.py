"""Pydantic schemas for Operational Copilot Engine (Phase 6)."""

from typing import Any, Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class CopilotQueryRequest(BaseModel):
    query: str = Field(..., description="Operational natural inquest from commander or operator")
    asset_id: Optional[int] = Field(None, description="Optional asset context ID")


class EvidenceItem(BaseModel):
    source: str = Field(..., description="ML_MODEL_A, ML_MODEL_B, ML_MODEL_C, HUMS_ANOMALY, READINESS_ENGINE, MAINTENANCE_INTELLIGENCE, SENSOR_TELEMETRY")
    metric: str
    value: Any
    explanation: str


class RelatedAssetItem(BaseModel):
    asset_id: int
    asset_code: str
    model: str
    location: str
    readiness_state: str
    readiness_score: float
    failure_probability: Optional[float] = None
    rul_hours: Optional[float] = None
    priority: Optional[str] = None


class CopilotResponse(BaseModel):
    query: str
    intent: str
    confidence: float
    answer: str
    evidence: List[EvidenceItem]
    related_assets: List[RelatedAssetItem]
    recommended_actions: List[str]
    timestamp: datetime


class IntentInfo(BaseModel):
    intent: str
    description: str
    example_queries: List[str]


class SupportedIntentsResponse(BaseModel):
    total_intents: int
    intents: List[IntentInfo]
