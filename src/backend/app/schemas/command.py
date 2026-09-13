"""Pydantic schemas for Command Intelligence & Fleet Analytics (Phase 6)."""

from typing import Any, Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class CommandKPIs(BaseModel):
    total_assets: int
    ready_assets: int
    caution_assets: int
    degraded_assets: int
    not_ready_assets: int
    fleet_readiness_index: float = Field(..., description="Average fleet readiness score (0-100)")
    critical_risk_assets: int
    active_anomaly_count: int
    high_failure_risk_assets: int
    assets_requiring_maintenance: int
    overdue_maintenance: int
    critical_interventions: int
    open_recommendations: int


class FleetRiskRankItem(BaseModel):
    rank: int
    asset_id: int
    asset_code: str
    asset_type: str
    model: str
    location: str
    risk_level: str
    readiness_state: str
    readiness_score: float
    failure_probability: float
    rul_hours: Optional[float]
    is_anomaly: bool
    maintenance_urgency: str
    composite_risk_score: float
    primary_risk_reason: str


class CommandAttentionQueueItem(BaseModel):
    rank: int
    asset_id: int
    asset_code: str
    asset_type: str
    model: str
    location: str
    attention_priority: str  # CRITICAL, HIGH, MEDIUM
    readiness_state: str
    readiness_score: float
    primary_issue: str
    evidence_summary: str
    recommended_next_action: str


class TrendItem(BaseModel):
    asset_id: int
    asset_code: str
    status: str  # READINESS_IMPROVING, READINESS_STABLE, READINESS_DETERIORATING, INSUFFICIENT_HISTORY
    current_score: float
    previous_score: Optional[float] = None
    score_delta: Optional[float] = None
    historical_count: int
    explanation: str


class FleetTrendSummary(BaseModel):
    improving_count: int
    stable_count: int
    deteriorating_count: int
    insufficient_history_count: int
    assets_with_trends: List[TrendItem]


class ReadinessChangeItem(BaseModel):
    asset_id: int
    asset_code: str
    change_type: str  # STATE_TRANSITION, SCORE_DROP, SCORE_RISE, NEW_ANOMALY, MAINTENANCE_COMPLETED
    previous_state: Optional[str] = None
    new_state: str
    previous_score: Optional[float] = None
    new_score: float
    trigger_evidence: str
    detected_at: datetime


class OperationalImpactAssessment(BaseModel):
    asset_id: int
    asset_code: str
    impact_level: str  # CRITICAL, HIGH, MEDIUM, LOW
    consequences: List[str]
    supporting_evidence: List[str]
    suggested_mitigation: str


class SubsystemReliabilityMetrics(BaseModel):
    subsystem_name: str
    active_anomaly_count: int
    historical_failures: int
    serviced_count: int
    condition_distribution: Dict[str, int]
    target_intervention_count: int
    common_parts_replaced: List[str]


class CommandOverviewResponse(BaseModel):
    timestamp: datetime
    kpis: CommandKPIs
    attention_queue: List[CommandAttentionQueueItem]
    top_risk_ranking: List[FleetRiskRankItem]
    trends: FleetTrendSummary
    recent_changes: List[ReadinessChangeItem]
    subsystem_metrics: List[SubsystemReliabilityMetrics]
