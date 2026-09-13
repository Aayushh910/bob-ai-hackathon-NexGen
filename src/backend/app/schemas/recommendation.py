from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class RecommendationResponse(BaseModel):
    id: int
    asset_id: int
    prediction_id: Optional[int] = None
    priority: str = Field(..., description="Priority: LOW, MEDIUM, HIGH, CRITICAL")
    recommendation: str
    reason: Optional[str] = None
    generated_at: datetime
    status: str = Field("PENDING", description="Status: PENDING, APPROVED, COMPLETED, DISMISSED")

    model_config = ConfigDict(from_attributes=True)
