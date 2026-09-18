"""API endpoints for SentinelAI Production Chatbot."""

import logging
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import chat_service

logger = logging.getLogger("sentinelai.chat_endpoint")

router = APIRouter()


@router.post(
    "",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit query to SentinelAI Assistant",
    description=(
        "Processes conversational queries regarding fleet readiness, assets, failure risks, "
        "sensor telemetry, anomalies, maintenance, and platform navigation. "
        "Grounded directly in Neon PostgreSQL data and synthesized via IBM Bob API."
    )
)
def submit_chat_query(
    request: ChatRequest,
    db: Session = Depends(get_db)
) -> ChatResponse:
    """End-to-end chat inquest endpoint."""
    return chat_service.process_chat(db=db, request=request)
