from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict, Field, model_validator

class RecommendationResponse(BaseModel):
    id: int
    asset_id: int
    asset_code: Optional[str] = None
    prediction_id: Optional[int] = None
    priority: str = Field(..., description="Priority: LOW, MEDIUM, HIGH, CRITICAL")
    recommendation: str
    action_directive: Optional[str] = None
    reason: Optional[str] = None
    rationale: Optional[str] = None
    generated_at: datetime
    created_at: Optional[datetime] = None
    status: str = Field("PENDING", description="Status: PENDING, APPROVED, COMPLETED, DISMISSED")

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def populate_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "action_directive" not in data or not data["action_directive"]:
                data["action_directive"] = data.get("recommendation")
            if "rationale" not in data or not data["rationale"]:
                data["rationale"] = data.get("reason")
            if "created_at" not in data or not data["created_at"]:
                data["created_at"] = data.get("generated_at")
            return data
        
        # If it's an ORM object
        if hasattr(data, "recommendation"):
            code = getattr(getattr(data, "asset", None), "asset_code", None)
            return {
                "id": getattr(data, "id", 0),
                "asset_id": getattr(data, "asset_id", 0),
                "asset_code": code or f"Asset #{getattr(data, 'asset_id', 0)}",
                "prediction_id": getattr(data, "prediction_id", None),
                "priority": getattr(data, "priority", "MEDIUM"),
                "recommendation": getattr(data, "recommendation", ""),
                "action_directive": getattr(data, "recommendation", ""),
                "reason": getattr(data, "reason", None),
                "rationale": getattr(data, "reason", None),
                "generated_at": getattr(data, "generated_at", datetime.now()),
                "created_at": getattr(data, "generated_at", datetime.now()),
                "status": getattr(data, "status", "OPEN"),
            }
        return data
