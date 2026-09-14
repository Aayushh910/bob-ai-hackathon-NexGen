import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import check_database_connection, engine, Base
from app.core.exceptions import register_exception_handlers
from app.api.v1.api import api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("sentinelai.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager.
    Auto-initializes all ORM database tables on startup if not present.
    """
    logger.info("Initializing SentinelAI application...")
    try:
        import app.models  # Register all models on Base.metadata
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified/created successfully.")
    except Exception as exc:
        logger.warning(f"Notice: Automatic DB table initialization skipped or delayed: {exc}")
    yield
    logger.info("Shutting down SentinelAI application...")

app = FastAPI(
    title="SentinelAI — Mission Readiness Copilot",
    description="Backend service for SentinelAI: Military & Industrial Mission Readiness, Telemetry Health & Predictive Maintenance.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# Register centralized exception handlers
register_exception_handlers(app)

# Configure CORS for Local, Render, and Vercel domains
origins = settings.get_cors_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 Routes
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get(
    "/",
    tags=["Root"],
    summary="Root Service Status",
    response_description="Service information and quick navigation links"
)
def root():
    """SentinelAI root endpoint providing health check and docs links."""
    return {
        "service": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "version": "1.0.0",
        "status": "operational",
        "documentation": "/docs",
        "health": "/health",
        "api_v1": settings.API_V1_STR
    }

@app.get(
    "/health",
    tags=["Health"],
    summary="System & Database Health Check",
    response_description="Operational status and PostgreSQL database connection state"
)
def health_check():
    """
    Verifies that the SentinelAI backend service is online
    and the PostgreSQL/Neon database is reachable.
    """
    db_connected = check_database_connection()

    if db_connected:
        return {
            "status": "healthy",
            "database": "connected",
            "service": settings.APP_NAME
        }
    else:
        logger.error("Health check failed: PostgreSQL database is disconnected.")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "database": "disconnected",
                "service": settings.APP_NAME
            }
        )

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", settings.PORT))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=settings.DEBUG)
