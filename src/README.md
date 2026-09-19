# SentinelAI — Autonomous Mission Readiness & Operational Copilot

SentinelAI is an enterprise-grade AI copilot and command intelligence system that ingests Health and Usage Monitoring System (HUMS) multi-sensor telemetry, runs real-time machine learning inferences across failure probabilities and remaining useful life (RUL), determines multi-factor mission readiness states, generates prioritized predictive maintenance interventions, and provides evidence-backed operational intelligence to military commanders and fleet maintenance operators.

---

## 1. System Architecture

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             REACT FRONTEND (Vite)                                │
│       Command Copilot  │  Mission Readiness  │  Maintenance  │  Fleet Assets     │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ REST APIs (/api/v1/*)
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                             FASTAPI BACKEND API                                  │
│   ├── /command       : Executive Fleet KPIs, Risk Ranking, Attention Queue       │
│   ├── /copilot       : Natural-Language Paraphrase Copilot & Grounded Evidence   │
│   │                    (Semantic Vector Cosine Classifier + Groq / Bob Few-Shot) │
│   ├── /readiness     : Multi-Factor Readiness Assessment Engine (4-Tier)         │
│   ├── /maintenance   : Intervention Prioritization & Reassessment Lifecycle      │
│   ├── /ml            : Model Status, Real-Time Prediction & RUL Estimation       │
│   ├── /anomalies     : Sensor Anomalies & Isolation Forest Inferences            │
│   ├── /telemetry     : HUMS Ingestion, Multi-Channel Time-Series Querying        │
│   └── /assets        : Asset Management & Component Registry                     │
└───────────────────┬──────────────────────────────────────────────┬───────────────┘
                    │                                              │
┌───────────────────▼──────────────────┐       ┌───────────────────▼───────────────┐
│        PRODUCTION ML ENGINES         │       │       POSTGRESQL DATABASE         │
│      (src/backend/app/ml/)           │       │          (localhost:5432)         │
│                                      │       │                                   │
│ • Model A: Failure Probability (RF)  │       │ • assets (53 units)               │
│ • Model B: RUL Regressor (ExtraTree) │       │ • sensor_readings (20,034 rows)   │
│ • Model C: Failure Mode (RF Class)   │       │ • anomalies (5,405 records)       │
│ • Anomaly: Isolation Forest          │       │ • predictions (103 inference logs)│
│ • Preprocessor: StandardScaler       │       │ • readiness_assessments (84 logs) │
│                                      │       │ • maintenance_records (306 logs)  │
│ Artifacts loaded from src/ML/Models/ │       │ • recommendations (252 items)     │
└──────────────────────────────────────┘       └───────────────────────────────────┘
```

---

## 2. Boundary: ML Training vs. Production Inference

To ensure enterprise stability and prevent runtime degradation:
- **`src/ML/`**: Houses model development, feature engineering, offline evaluation, and static binary model artifacts (`.joblib`, `.json`).
- **`src/backend/app/ml/`**: The runtime production layer. It imports the pre-trained artifacts on service startup into an in-memory `ModelRegistry`, providing low-latency, non-blocking inference without any ad-hoc retraining.

| Model Component | Trained Artifact File | Runtime Production Wrapper | Output / Purpose |
|:---|:---|:---|:---|
| **Model A** | `failure_probability_model.joblib` | `ModelRegistry.failure_model` | 50-hour failure probability $[0.0, 1.0]$ |
| **Model B** | `rul_model.joblib` | `ModelRegistry.rul_model` | Remaining Useful Life in operational hours |
| **Model C** | `failure_mode_model.joblib` | `ModelRegistry.failure_mode_model` | Failure Mode (e.g. Pressure Drop, Bearing Wear) |
| **Anomaly Engine** | `anomaly_isolation_forest.joblib` | `ModelRegistry.anomaly_model` | Outlier score & anomaly flags |
| **Feature Scaler** | `sensor_scaler.joblib` | `ModelRegistry.sensor_scaler` | Robust standard scaling of sensor vectors |

---

## 3. Operational Data Flow

1. **HUMS Telemetry Ingestion**: Multi-sensor measurements (vibration, temperature, oil pressure, fuel pressure, RPM, hydraulic pressure, battery voltage) stream into PostgreSQL `sensor_readings`.
2. **Feature Preparation & ML Inference**: Incoming telemetry is scaled and passed to Model A, Model B, and Model C.
3. **Anomaly Attribution**: Isolation Forest identifies sensor channel deviations and records anomaly events in `anomalies`.
4. **Deterministic Readiness Scoring**: The `ReadinessAssessmentEngine` evaluates operational state:
   - **`READY`**: Low risk, failure prob $< 0.30$, RUL $> 50$h, no active anomalies.
   - **`CAUTION`**: Moderate risk, failure prob $[0.30, 0.50]$, RUL $[35, 50]$h, minor anomalies.
   - **`DEGRADED`**: High risk, failure prob $[0.50, 0.75]$, RUL $[15, 35]$h, operational constraints applied.
   - **`NOT_READY`**: Critical risk, failure prob $\ge 0.75$, RUL $< 15$h, or severe subsystem failure. Asset grounded.
5. **Predictive Maintenance Planning**: The `MaintenancePlanningEngine` identifies affected components, calculates urgency (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), and compiles deduplicated intervention plans.
6. **Command Intelligence Synthesis**: Aggregates fleet KPIs, composite risk scores (0–105 scale), and prioritizes the Command Attention Queue.
7. **Operational Copilot**: Translates natural commander questions into structured, evidence-grounded responses using semantic paraphrase understanding (handles typos, abbreviations like FMC/NMC/RUL/HUMS, entity notations like `Platform 21`, and contextual follow-ups like `"Why is it down?"`) with zero keyword gates.
8. **Maintenance & Reassessment**: Upon completing maintenance, a fresh assessment is executed to determine updated readiness based strictly on post-service evidence.

---

## 4. Quick Start & Execution

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+ running on `localhost:5432`

### Environment Configuration (`src/backend/.env`)
```ini
APP_NAME=SentinelAI
APP_ENV=production
DEBUG=False

DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=SentinelAI
DATABASE_USER=postgres
DATABASE_PASSWORD=your_secure_password

CORS_ORIGINS=http://localhost:3000,http://localhost:5173
FRONTEND_URL=http://localhost:5173
JWT_SECRET_KEY=your_jwt_secret_key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### Backend Startup
```powershell
cd src/backend
# Activate virtual environment
.\venv\Scripts\Activate.ps1
# Apply database migrations
alembic upgrade head
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

1. **Executive Command View**: Navigate to `Command Copilot`. Observe Fleet KPIs (53 assets, 16.4% readiness index, 35 critical risk assets, 42 critical interventions).
2. **Commander Inquest**: Submit prompt: `"Which assets need immediate attention?"`
   - *Result*: The copilot returns top critical assets ranked by multi-factor composite risk, led by Asset **`A002`**.
3. **Asset Deep-Dive (`A002`)**:
   - Query: `"Why is asset A002 not ready?"`
   - *Evidence Chain*: Shows readiness state `NOT_READY` (score 12.0/100), 60.6% failure probability, RUL 0.0h, and 128 active anomalies on Hydraulic System.
4. **Contrast with Operational Asset (`A001`)**:
   - Query: `"What is the status of asset A001?"`
   - *Evidence Chain*: Shows readiness state `READY` (score 95.0/100), 23.8% failure probability, RUL 50.7h, 0 anomalies.
5. **Predictive Maintenance Execution**:
   - Navigate to `Maintenance` tab. Locate Asset `A002` under Critical Intervention Queue.
   - Click "Inspect Asset" $\rightarrow$ review target component (Hydraulic System) and recommended action.
   - Execute Maintenance Action (`Complete Maintenance & Reassess`).
6. **Evidence-Based Reassessment**:
   - The system executes post-maintenance inference. Readiness score updates strictly according to verified evidence.

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

Run frontend production build verification:
```powershell
cd src/frontend
npm run build
```
