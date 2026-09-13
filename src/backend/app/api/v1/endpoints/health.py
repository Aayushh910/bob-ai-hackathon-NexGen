import logging
from datetime import datetime, timezone
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from app.core.database import check_database_connection
from app.core.config import settings

logger = logging.getLogger("sentinelai.api.health")

router = APIRouter()

@router.get(
    "/health",
    summary="SentinelAI System & Database Health",
    description="Returns operational status of the backend API and the connected PostgreSQL database."
)
def api_v1_health():
    """
    Check the operational status of the SentinelAI v1 API and PostgreSQL database.
    """
    db_ok = check_database_connection()
    timestamp = datetime.now(timezone.utc).isoformat()

    if db_ok:
        return {
            "status": "healthy",
            "service": settings.APP_NAME,
            "version": "1.0.0",
            "database": "connected",
            "database_type": "PostgreSQL",
            "timestamp": timestamp
        }
    else:
        logger.error("Database connection check failed during /api/v1/health call.")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "service": settings.APP_NAME,
                "version": "1.0.0",
                "database": "disconnected",
                "database_type": "PostgreSQL",
                "timestamp": timestamp
            }
        )
