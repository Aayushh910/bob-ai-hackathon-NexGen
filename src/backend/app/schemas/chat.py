"""Pydantic schemas for SentinelAI Chatbot API."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of the speaker ('user', 'assistant', 'system')")
    content: str = Field(..., description="Message text content")


class ChatRequest(BaseModel):
    message: str = Field(..., description="The user's question or message")
    conversationId: Optional[str] = Field(None, description="Optional persistent conversation session ID")
    history: List[ChatMessage] = Field(default_factory=list, description="Recent conversation turns for follow-ups")
    requestId: Optional[str] = Field(None, description="Optional client request ID for race condition protection")


class NavigationAction(BaseModel):
    label: str = Field(..., description="User-facing button label (e.g. 'Open Predictions')")
    route: str = Field(..., description="Target frontend route (e.g. '/predictions')")
    breadcrumb: Optional[List[str]] = Field(None, description="Human readable path (e.g. ['Dashboard', 'Predictions'])")


class ConversationState(BaseModel):
    current_asset: Optional[str] = Field(None, description="Currently active asset context")
    current_topic: Optional[str] = Field(None, description="Active topic/intent area")
    last_intent: Optional[str] = Field(None, description="Last classified intent")


class TroubleshootingItem(BaseModel):
    category: str
    severity: str
    component: Optional[str] = None
    observation: str
    recommended_checks: List[str]
    operational_directive: str


class ChatResponse(BaseModel):
    success: bool = Field(True, description="Whether the inquest completed successfully")
    message: str = Field(..., description="Formatted markdown message for display")
    responseType: str = Field(
        ...,
        description="Category: 'data', 'knowledge', 'navigation', 'mixed', 'troubleshooting', 'general', or 'error'"
    )
    resultStatus: Optional[str] = Field(
        "FOUND",
        description="Result state: 'FOUND', 'NOT_FOUND', 'EMPTY_RESULT', 'DATABASE_ERROR', 'AMBIGUOUS_ENTITY'"
    )
    data: Optional[Dict[str, Any]] = Field(None, description="Structured data payload for client rendering")
    navigation: Optional[NavigationAction] = Field(None, description="Optional navigation trigger")
    troubleshooting: Optional[Dict[str, Any]] = Field(None, description="Structured troubleshooting recommendations")
    suggestions: List[str] = Field(default_factory=list, description="Context-aware follow-up suggestion chips")
    sources: List[str] = Field(default_factory=list, description="Information sources used, e.g. ['database'], ['ibm-bob']")
    requestId: Optional[str] = Field(None, description="Mirrored client request ID")
    intent: Optional[str] = Field(None, description="Classified intent identifier")
    confidence: Optional[float] = Field(None, description="Classification confidence score")
