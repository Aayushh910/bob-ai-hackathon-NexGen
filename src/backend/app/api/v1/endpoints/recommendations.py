from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, Body, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.recommendation import recommendation_service
from app.schemas.recommendation import RecommendationResponse

router = APIRouter()

class StatusUpdateRequest(BaseModel):
    status: str

@router.get(
    "",
    summary="List fleet recommendations",
    description="Query operational recommendations with optional filtering by asset, lifecycle status, and priority."
)
def list_recommendations(
    asset_id: Optional[int] = Query(None, description="Filter by Asset ID"),
    status: Optional[str] = Query(None, description="Filter by status: OPEN, PENDING, ACKNOWLEDGED, RESOLVED"),
    priority: Optional[str] = Query(None, description="Filter by priority: LOW, MEDIUM, HIGH, CRITICAL"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    items, total = recommendation_service.list_recommendations(
        db=db, asset_id=asset_id, status=status, priority=priority, skip=skip, limit=limit
    )
    page = (skip // limit) + 1 if limit > 0 else 1
    return {
        "total": total,
        "page": page,
        "size": len(items),
        "items": [RecommendationResponse.model_validate(i) for i in items]
    }

@router.patch(
    "/{recommendation_id}/status",
    response_model=RecommendationResponse,
    summary="Update recommendation status",
    description="Transition recommendation lifecycle state to ACKNOWLEDGED, RESOLVED, or DISMISSED."
)
def update_recommendation_status(
    recommendation_id: int,
    payload: StatusUpdateRequest,
    db: Session = Depends(get_db)
):
    try:
        updated = recommendation_service.update_status(
            db=db, recommendation_id=recommendation_id, new_status=payload.status
        )
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Recommendation with ID {recommendation_id} not found."
            )
        return RecommendationResponse.model_validate(updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
