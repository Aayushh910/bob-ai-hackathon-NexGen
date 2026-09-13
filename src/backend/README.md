# SentinelAI Backend Service

High-performance asynchronous backend API for SentinelAI Mission Readiness & Operational Copilot.

## Core Stack
- **Framework**: FastAPI (Python 3.11)
- **Database**: PostgreSQL 14+ (SQLAlchemy ORM + Alembic)
- **ML Runtime**: scikit-learn (Joblib serialized models in `src/ML/Models/`)
- **Validation**: Pydantic v2 / Pydantic Settings

## Application Structure
- `app/api/v1/endpoints/`: REST API controllers (`health`, `assets`, `telemetry`, `predictions`, `anomalies`, `ml`, `readiness`, `recommendations`, `maintenance`, `command`, `copilot`).
- `app/core/`: Configuration, PostgreSQL database session management, custom exceptions, and security.
- `app/models/`: SQLAlchemy database models (`Asset`, `SensorReading`, `Anomaly`, `Prediction`, `ReadinessAssessment`, `MaintenanceRecord`, `Recommendation`).
- `app/schemas/`: Pydantic request/response validation schemas.
- `app/repositories/`: Clean repository layer managing optimized database queries.
- `app/services/`: Core business logic engines (`readiness`, `maintenance`, `command`, `copilot`, `sensor`, `prediction`).
- `app/ml/`: Production `ModelRegistry` providing non-blocking model artifact caching and inference.

## Database Migrations
Run Alembic migrations to upgrade the schema:
```powershell
alembic upgrade head
```

## Running Tests
```powershell
.\venv\Scripts\pytest.exe
```
