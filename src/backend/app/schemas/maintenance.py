from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

class MaintenanceRecordBase(BaseModel):
    asset_id: int = Field(..., description="ID of associated asset")
    component_id: Optional[str] = Field(None, max_length=50)
    component_type: Optional[str] = Field(None, max_length=100)
    maintenance_date: datetime = Field(..., description="Date of maintenance performed")
    operating_hours: Optional[float] = None
    maintenance_type: str = Field(..., max_length=50, description="Preventive, Corrective, Inspection")
    component: Optional[str] = Field(None, max_length=100)
    issue_detected: Optional[str] = None
    failure_type: Optional[str] = None
    component_condition: Optional[str] = None
    parts_replaced: Optional[str] = None
    failure_occurred: bool = False
    maintenance_duration_hours: Optional[float] = None
    next_maintenance_due_hours: Optional[float] = None
    description: Optional[str] = None
    technician: Optional[str] = None
    cost: Optional[float] = None
    next_maintenance_date: Optional[datetime] = None
    maintenance_status: str = Field("COMPLETED", description="IDENTIFIED, PLANNED, IN_PROGRESS, COMPLETED, CANCELLED")

class MaintenanceRecordCreate(MaintenanceRecordBase):
    pass

class MaintenanceRecordResponse(MaintenanceRecordBase):
    id: int
    asset_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class MaintenanceDueAssessment(BaseModel):
    due_status: str = Field(..., description="NOT_DUE, UPCOMING, DUE, OVERDUE, URGENT")
    current_operating_hours: float
    next_due_hours: Optional[float] = None
    hours_until_due: Optional[float] = None
    rul_hours: Optional[float] = None
    urgency_reason: str

class ComponentMaintenanceInsight(BaseModel):
    component_type: str
    component_id: Optional[str] = None
    serviced_count: int = 0
    failure_count: int = 0
    latest_condition: str = "Good"
    latest_parts_replaced: Optional[str] = None
    correlated_sensors: List[str] = []
    active_anomaly_detected: bool = False
    predicted_distress: Optional[str] = None

class InterventionPlan(BaseModel):
    asset_id: int
    asset_code: str
    priority: str = Field(..., description="CRITICAL, HIGH, MEDIUM, LOW")
    due_status: str
    target_component: Optional[str] = None
    recommended_action: str
    justification: str
    supporting_evidence: Dict[str, Any] = {}
    created_at: datetime

class MaintenanceQueueItem(BaseModel):
    asset_id: int
    asset_code: str
    asset_type: str
    model: str
    location: str
    priority: str = Field(..., description="CRITICAL, HIGH, MEDIUM, LOW")
    due_status: str
    readiness_state: str
    target_component: Optional[str] = None
    failure_probability: Optional[float] = None
    rul_hours: Optional[float] = None
    is_anomaly: bool = False
    recommended_action: str
    open_directives_count: int = 0

class MaintenanceFleetSummary(BaseModel):
    total_assets_requiring_maintenance: int
    critical_interventions: int
    high_priority_interventions: int
    due_count: int
    overdue_count: int
    upcoming_count: int
    open_directives_count: int
    total_historical_records: int
    most_serviced_component: Optional[str] = None

class MaintenanceListResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[MaintenanceRecordResponse]

class MaintenanceStatusUpdatePayload(BaseModel):
    status: str = Field(..., description="PLANNED, IN_PROGRESS, COMPLETED, CANCELLED")
    performed_by: Optional[str] = None
    action_taken: Optional[str] = None
    parts_replaced: Optional[str] = None
    component_condition: Optional[str] = None
    cost: Optional[float] = None

class MaintenanceCompletePayload(BaseModel):
    asset_id: int
    component_type: str
    parts_replaced: str = "None"
    technician: str = "Lead Maintenance Specialist"
    notes: str = "Scheduled preventive/corrective maintenance executed."

class PostMaintenanceReassessmentResult(BaseModel):
    message: str
    maintenance_record: MaintenanceRecordResponse
    updated_readiness: Any
