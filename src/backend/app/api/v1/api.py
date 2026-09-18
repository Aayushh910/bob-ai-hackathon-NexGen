from fastapi import APIRouter
from app.api.v1.endpoints import (
    health, assets, components, dashboard, telemetry, predictions,
    anomalies, ml, readiness, recommendations, maintenance, command, copilot
)

api_router = APIRouter()

# Include health endpoints
api_router.include_router(health.router, tags=["Health"])

# Include asset endpoints
api_router.include_router(assets.router, prefix="/assets", tags=["Assets"])

# Include component endpoints
api_router.include_router(components.router, prefix="/components", tags=["Components"])

# Include dashboard endpoints
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])

# Include telemetry endpoints
api_router.include_router(telemetry.router, prefix="/telemetry", tags=["Telemetry"])

# Include predictions endpoints
api_router.include_router(predictions.router, prefix="/predictions", tags=["Predictions"])

# Include anomalies endpoints
api_router.include_router(anomalies.router, prefix="/anomalies", tags=["Anomalies"])

# Include ML status & RUL endpoints
api_router.include_router(ml.router, prefix="/ml", tags=["Machine Learning"])

# Include Mission Readiness endpoints
api_router.include_router(readiness.router, prefix="/readiness", tags=["Mission Readiness"])

# Include Recommendations endpoints
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["Recommendations"])

# Include Maintenance endpoints (Phase 5)
api_router.include_router(maintenance.router, prefix="/maintenance", tags=["Maintenance"])

# Include Command Intelligence endpoints (Phase 6)
api_router.include_router(command.router, prefix="/command", tags=["Command Intelligence"])

# Include Operational Copilot endpoints (Phase 6)
api_router.include_router(copilot.router, prefix="/copilot", tags=["Operational Copilot"])

