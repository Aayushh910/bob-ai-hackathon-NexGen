"""API endpoints for Operational Copilot (Phase 6)."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.copilot import (
    CopilotQueryRequest,
    CopilotResponse,
    SupportedIntentsResponse,
)
from app.services.copilot import copilot_service

router = APIRouter()


@router.post(
    "/query",
    response_model=CopilotResponse,
    summary="Submit operational inquest to SentinelAI Copilot",
)
def ask_copilot(
    request: CopilotQueryRequest,
    db: Session = Depends(get_db),
) -> CopilotResponse:
    """Processes natural operational questions regarding fleet readiness, critical assets,
    anomalies, failure risks, RUL, maintenance schedules, and asset-specific diagnostics.
    Returns a deterministic, evidence-backed answer without hallucinations."""
    return copilot_service.query(db=db, request=request)


@router.get(
    "/intents",
    response_model=SupportedIntentsResponse,
    summary="List all supported operational intents and example queries",
)
def get_supported_intents() -> SupportedIntentsResponse:
    """Returns the list of all deterministic operational inquest intents supported by the Copilot."""
    intents = copilot_service.SUPPORTED_INTENTS
    return SupportedIntentsResponse(
        total_intents=len(intents),
        intents=intents,
    )
