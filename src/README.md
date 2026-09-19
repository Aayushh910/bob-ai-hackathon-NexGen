# SentinelAI — Autonomous Mission Readiness & Operational Copilot

SentinelAI is an enterprise-grade AI copilot and command intelligence system that ingests Health and Usage Monitoring System (HUMS) multi-sensor telemetry, runs real-time machine learning inferences across component failure probabilities and operational health scores, determines multi-factor mission readiness states, generates prioritized predictive maintenance interventions, and provides evidence-backed operational intelligence to military commanders and fleet maintenance operators.

---

## 1. System Architecture

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                 REACT FRONTEND (Vite 8)                                  │
│   Overview  │  Fleet Assets  │  Predictions  │  Trends & Health  │  AI Copilot  │ Reports│
└────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                             │ REST APIs (/api/v1/*, /api/*)
┌────────────────────────────────────────────▼─────────────────────────────────────────────┐
│                                 FASTAPI BACKEND API                                      │
│   ├── /dashboard     : Fleet Readiness Rate, Status Breakdown, Critical Components       │
│   ├── /assets        : Fleet Asset Registry, Inspection Data & Subsystems                │
│   ├── /components    : Subsystem Details, Historical Telemetry & SHAP Explanations       │
│   ├── /telemetry     : 11-Channel HUMS Ingestion & Time-Series History                   │
│   ├── /predictions   : Component Failure Predictions, Health Scores & Priorities         │
│   ├── /anomalies     : Sensor Anomalies, Attributions & Severity Analysis                │
│   ├── /ml            : In-Memory Model Registry Observability & RUL Estimates            │
│   ├── /copilot       : Deterministic Operational Inquests & Supported Intents            │
│   ├── /chat          : Conversational AI Copilot (TF-IDF Semantic Engine + Groq / Bob)   │
│   ├── /maintenance   : Intervention Prioritization & Service Logs                        │
│   ├── /readiness     : Multi-Factor Readiness Assessments & Fleet Statistics             │
│   ├── /command       : Command Intelligence KPIs, Trends & Subsystem Risk                │
│   └── /auth          : Single-Administrator Authentication (Bcrypt + JWT Sessions)       │
└───────────────────────┬──────────────────────────────────────────────┬───────────────────┘
                        │                                              │
┌───────────────────────▼──────────────────────┐       ┌───────────────▼───────────────────┐
│            PRODUCTION ML ENGINES             │       │        POSTGRESQL DATABASE        │
│             (src/ML/model/*.pkl)             │       │      (Neon Serverless / Local)    │
│                                              │       │                                   │
│ • Engine Anomaly Model (RandomForest)        │       │ • assets (53 platforms)           │
│ • Engine Failure Model (RandomForest)        │       │ • components (212 subsystems)     │
│ • Battery Anomaly Model (RandomForest)       │       │ • sensor_readings (20,000+ rows)  │
│ • Battery Failure Model (XGBoost)            │       │ • predictions (historical logs)   │
│ • Fuel Pump Anomaly Model (RandomForest)     │       │ • prediction_explanations (SHAP)  │
│ • Fuel Pump Failure Model (RandomForest)     │       │ • trend_analysis (sensor trends)  │
│ • Hydraulic System Anomaly (RandomForest)    │       │ • asset_status (readiness states) │
│ • Hydraulic System Failure (RandomForest)    │       │ • maintenance_records (logs)      │
│ • SHAP TreeExplainer (Feature Contributions) │       │ • readiness_assessments (history) │
│                                              │       │ • recommendations (work orders)   │
│ Artifacts loaded by ModelRegistry            │       │ • anomalies (flagged events)      │
└──────────────────────────────────────────────┘       └───────────────────────────────────┘
```

---

## 2. Boundary: ML Training vs. Production Inference

To ensure enterprise stability and prevent runtime degradation:
- **`src/ML/`**: Houses model development, training scripts/notebooks (`train/`), raw and test telemetry datasets (`Data/`), and the 8 serialized component pipelines (`model/*.pkl`).
- **`src/backend/app/ml/`**: The runtime production layer. It imports the pre-trained artifacts on service startup into an in-memory `ModelRegistry`, providing low-latency, non-blocking inference without any ad-hoc retraining.

| Component Type | Prediction Type | Trained Artifact File | Pipeline Classifier | Primary Task |
|:---|:---|:---|:---|:---|
| **Engine** | Anomaly | `engine_anomaly_model.pkl` | `RandomForestClassifier` | Detects multivariate engine sensor drift |
| **Engine** | Failure | `engine_failure_model.pkl` | `RandomForestClassifier` | 50-hour engine failure probability $[0.0, 1.0]$ |
| **Battery** | Anomaly | `battery_anomaly_model.pkl` | `RandomForestClassifier` | Detects battery voltage and charge anomalies |
| **Battery** | Failure | `battery_failure_model.pkl` | `XGBClassifier` | 50-hour battery exhaustion risk $[0.0, 1.0]$ |
| **Fuel Pump** | Anomaly | `fuel_pump_anomaly_model.pkl` | `RandomForestClassifier` | Detects cavitation and fuel pressure instability |
| **Fuel Pump** | Failure | `fuel_pump_failure_model.pkl` | `RandomForestClassifier` | 50-hour fuel delivery failure probability |
| **Hydraulic System** | Anomaly | `hydraulic_system_anomaly_model.pkl` | `RandomForestClassifier` | Detects hydraulic pressure loss and fluid anomalies |
| **Hydraulic System** | Failure | `hydraulic_system_failure_model.pkl` | `RandomForestClassifier` | 50-hour hydraulic subsystem failure risk |
| **All Components** | Explainability | `SHAPExplanationService` | `shap.TreeExplainer` | Computes top sensor contribution importances |

---

## 3. Operational Data Flow

1. **HUMS Telemetry Ingestion**: 11-channel multi-sensor measurements (temperature, vibration, oil pressure, fuel pressure, RPM, hydraulic pressure, battery voltage, coolant temperature, operating hours, load percentage, ambient temperature) stream into PostgreSQL `sensor_readings`.
2. **Feature Extraction & In-Memory Inference**: Telemetry features and rolling statistics are evaluated through designated component pipelines via `ModelRegistry`.
3. **SHAP Feature Attribution**: `TreeExplainer` decomposes predictions into mathematical feature contributions, isolating primary and secondary drivers.
4. **Deterministic Readiness Scoring**: `ScoringService` evaluates component metrics and aggregates overall asset health:
   - **Health Score ($0–100$):** $100 - (0.50 \times \text{FailureRisk}) - (0.30 \times \text{AnomalySeverity}) - (0.20 \times \text{TrendRisk})$.
   - **Maintenance Priority:** $(0.60 \times \text{FailureRisk}) + (0.25 \times \text{AnomalySeverity}) + (0.15 \times \text{TrendRisk})$, mapped to `CRITICAL` ($\ge 80$), `HIGH` ($60–79$), `MEDIUM` ($40–59$), or `LOW` ($< 40$).
   - **Operational State:** Assigned as `READY`, `ATTENTION` (multiple high-priority or anomalous components), or `NOT_READY` (any critical component).
5. **Predictive Maintenance Planning**: The system identifies affected components, calculates urgency, and attaches standardized diagnostic inspection checklists.
6. **Command Copilot Synthesis**: Translates natural commander questions into structured, evidence-grounded responses using semantic paraphrase understanding (handles typos, abbreviations like `FMC`/`NMC`/`RUL`/`HUMS`, entity notations like `Platform 21`, and conversational follow-ups) with zero keyword gates. Rejects non-platform inquiries with an explicit SentinelAI scope disclaimer.
7. **Maintenance & Reassessment**: Upon completing maintenance, a fresh assessment is executed to determine updated readiness based strictly on post-service evidence.

---

## 4. Quick Start & Execution

### Prerequisites
- Python 3.11+
- Node.js 18+ (Node 20+ LTS recommended)
- PostgreSQL 14+ running locally on port `5432` or remote Neon Serverless PostgreSQL connection string

### Environment Configuration (`src/backend/.env`)
```ini
APP_NAME=SentinelAI
APP_ENV=development
DEBUG=True
PORT=8000

# Remote Neon PostgreSQL (or local instance)
DATABASE_URL=postgresql://user:password@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require

# Frontend & CORS Configuration
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Security & Administrator Credentials
ADMIN_EMAIL=sentinelai712@gmail.com
ADMIN_PASSWORD_HASH=<your-bcrypt-password-hash>
JWT_SECRET_KEY=<your-secret-key>

# Cloud Inference (Groq / IBM Bob)
GROQ_API_KEY=<your-groq-key>
GROQ_MODEL=openai/gpt-oss-120b
```

### Backend Startup
```powershell
cd src/backend
# Activate virtual environment
.\venv\Scripts\Activate.ps1
# Apply database migrations
alembic upgrade head
# Optional: Ingest seed telemetry dataset
python scripts/ingest_test_data.py
# Start FastAPI application
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Startup
```powershell
cd src/frontend
npm install
npm run dev
```
Open `http://localhost:5173` to access SentinelAI.

---

## 5. Golden Demonstration Flow

To demonstrate the full operational lifecycle during evaluation:

1. **Tactical Authentication**: Navigate to `http://localhost:5173` $\rightarrow$ Enter administrator credentials (`sentinelai712@gmail.com`).
2. **Executive Overview**: Observe Fleet Readiness Rate, status distribution (`READY`, `ATTENTION`, `NOT_READY`), and critical component queues.
3. **Fleet Asset Inspection**:
   - Navigate to `Fleet Assets` $\rightarrow$ Filter by `NOT_READY` or `ATTENTION`.
   - Click an asset (e.g. `A002`) to inspect real-time subsystem condition, telemetry feeds, and 50h failure risks.
4. **Component Analysis & SHAP Drill-Down**:
   - Select a degraded subsystem (e.g. `Hydraulic System` or `Engine`).
   - View historical sensor charts, anomaly severity, and ranked SHAP feature importances explaining the root cause.
5. **Operational Copilot Inquest**:
   - Switch to `AI Copilot` $\rightarrow$ Submit natural question: `"Which assets need immediate attention?"`
   - Ask follow-up: `"Why is asset A002 not ready?"`
   - Test abbreviation: `"Show FMC assets in the fleet"`
   - Test domain boundary: `"What is the weather today?"` $\rightarrow$ Copilot politely provides a SentinelAI platform scope notice.
6. **Tactical Reports Export**:
   - Navigate to `Reports` $\rightarrow$ Filter by subsystem or status.
   - Click `Download Filtered CSV` for instant client-side data export, or `Generate Tactical PDF Report`.

---

## 6. Verification & Automated Testing

Run the natural-language paraphrase copilot test suite (154/154 passing):
```powershell
cd src/backend
.\venv\Scripts\pytest.exe tests\test_copilot_paraphrase.py -v
```

Run the full pytest suite:
```powershell
cd src/backend
.\venv\Scripts\pytest.exe
```

Run chat inquest integration test:
```powershell
cd src/backend
python scripts/test_chat_suite.py
```

Run frontend production build verification:
```powershell
cd src/frontend
npm run build
```
