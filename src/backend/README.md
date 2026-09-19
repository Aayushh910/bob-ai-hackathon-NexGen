# SentinelAI Backend Service

High-performance asynchronous backend REST API for SentinelAI Mission Readiness & Operational Copilot.

## Core Stack
- **Framework**: FastAPI (Python 3.11, Uvicorn, Pydantic v2)
- **Database**: PostgreSQL 14+ / Neon Serverless PostgreSQL (SQLAlchemy 2.0 ORM + Alembic migrations)
- **ML Runtime**: Scikit-learn & XGBoost (8 component-specific pipelines serialized via Pickle in `src/ML/model/*.pkl`), SHAP TreeExplainer
- **NLP & Copilot Engine**: Hybrid TF-IDF Word & Char N-Gram Cosine Vector Classifier + Groq API (`openai/gpt-oss-120b`) / IBM Bob API (`ibm/granite-3-8b-instruct`)
- **Security & Authentication**: Single-Administrator Bcrypt verification, HS256 JWT tokens, HTTP-Only session cookies (`sentinel_session`) and `Authorization: Bearer`
- **Defense Notification**: Dual-channel alerting engine (`alert_notifier.py`) with secure SMTP (TLS), Brevo API fallback, and static recipient whitelisting

## Application Structure
- `app/api/v1/endpoints/`: REST API controllers (`anomalies`, `assets`, `auth`, `chat`, `command`, `components`, `copilot`, `dashboard`, `health`, `maintenance`, `ml`, `predictions`, `readiness`, `recommendations`, `telemetry`).
- `app/core/`: Configuration (`config.py`), PostgreSQL database connectivity (`database.py`), custom exceptions (`exceptions.py`), security and JWT session handling (`security.py`).
- `app/models/`: SQLAlchemy ORM database entities (`Asset`, `Component`, `SensorReading`, `Anomaly`, `Prediction`, `PredictionExplanation`, `TrendAnalysis`, `AssetStatus`, `MaintenanceRecord`, `ReadinessAssessment`, `Recommendation`).
- `app/schemas/`: Pydantic request and response schemas enforcing strict typing and engineering limit validation.
- `app/repositories/`: Data access layer executing optimized database queries.
- `app/services/`: Core operational business logic:
  - `alert_notifier.py`: Dual-channel notification engine (SMTP + Brevo fallback).
  - `semantic_intent.py`: TF-IDF vectorizer, abbreviation expansion, and 15-intent classifier.
  - `chat_service.py` & `copilot.py`: Conversational copilot orchestrator and deterministic inquest engine.
  - `ibm_bob_client.py`: Groq and IBM Bob cloud inference client.
  - `scoring_service.py`: Composite health scores ($0–100$), maintenance priority, and readiness status.
  - `shap_service.py`: TreeSHAP explanation service computing component feature attributions.
  - `troubleshooting_engine.py`: Prescriptive operational diagnostic procedures.
  - `trend_service.py`: Time-series sensor trend risk evaluations.
  - `prediction.py`, `anomaly.py`, `maintenance.py`, `readiness.py`, `recommendation.py`.
- `app/ml/`: In-memory `ModelRegistry` discovering, caching, and serving all 8 component models from `src/ML/model/`.

## Database Migrations
Run Alembic migrations to initialize or upgrade the schema:
```powershell
alembic upgrade head
```

## Running Tests
Run the natural-language paraphrase copilot test suite:
```powershell
.\venv\Scripts\pytest.exe tests\test_copilot_paraphrase.py -v
```

Run all unit and integration tests:
```powershell
.\venv\Scripts\pytest.exe
```

Run automated chat inquest suite:
```powershell
python scripts\test_chat_suite.py
```

