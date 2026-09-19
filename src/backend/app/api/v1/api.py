from fastapi import APIRouter, Depends
from app.core.security import get_current_admin
from app.api.v1.endpoints import (
    auth, health, assets, components, dashboard, telemetry, predictions,
    anomalies, ml, readiness, recommendations, maintenance, command, copilot, chat
)

api_router = APIRouter()

# ── Public Endpoints (No Authentication Required) ──
# Authentication login, logout, and session check
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

# Health checks for infrastructure monitoring
api_router.include_router(health.router, tags=["Health"])


# ── Protected Endpoints (Strict Administrator Authentication Required) ──
protected_dep = [Depends(get_current_admin)]

# Fleet assets
api_router.include_router(assets.router, prefix="/assets", tags=["Assets"], dependencies=protected_dep)

# Subsystem components
api_router.include_router(components.router, prefix="/components", tags=["Components"], dependencies=protected_dep)

# Operational dashboard
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"], dependencies=protected_dep)

# Sensor telemetry
api_router.include_router(telemetry.router, prefix="/telemetry", tags=["Telemetry"], dependencies=protected_dep)

# Predictive failure horizons
api_router.include_router(predictions.router, prefix="/predictions", tags=["Predictions"], dependencies=protected_dep)

# Telemetry anomalies
api_router.include_router(anomalies.router, prefix="/anomalies", tags=["Anomalies"], dependencies=protected_dep)

# Machine learning diagnostics
api_router.include_router(ml.router, prefix="/ml", tags=["Machine Learning"], dependencies=protected_dep)

# Fleet mission readiness
api_router.include_router(readiness.router, prefix="/readiness", tags=["Mission Readiness"], dependencies=protected_dep)

# Prescriptive recommendations
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["Recommendations"], dependencies=protected_dep)

# Maintenance orders & logs
api_router.include_router(maintenance.router, prefix="/maintenance", tags=["Maintenance"], dependencies=protected_dep)

# Command intelligence
api_router.include_router(command.router, prefix="/command", tags=["Command Intelligence"], dependencies=protected_dep)

# Operational copilot
api_router.include_router(copilot.router, prefix="/copilot", tags=["Operational Copilot"], dependencies=protected_dep)

# Tactical chatbot
api_router.include_router(chat.router, prefix="/chat", tags=["SentinelAI Chatbot"], dependencies=protected_dep)
