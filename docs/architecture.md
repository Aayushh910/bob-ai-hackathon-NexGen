# 🏛️ SentinelAI — System Architecture

> **Technical Architecture, Data Flow, and Component Design for the Mission Readiness & Predictive Maintenance Copilot**

---

## 📐 System Architecture Diagram

```mermaid
flowchart TD
    %% ── Styles ───────────────────────────────────────────────────────────
    classDef sensor    fill:#0c1a2e,stroke:#38bdf8,stroke-width:2px,color:#e0f2fe;
    classDef api       fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#ede9fe;
    classDef ml        fill:#2e1065,stroke:#c084fc,stroke-width:2px,color:#f3e8ff;
    classDef readiness fill:#4a044e,stroke:#f472b6,stroke-width:2px,color:#fce7f3;
    classDef db        fill:#052e16,stroke:#34d399,stroke-width:2px,color:#d1fae5;
    classDef copilot   fill:#1c1917,stroke:#fb923c,stroke-width:2px,color:#ffedd5;
    classDef ui        fill:#042f2e,stroke:#2dd4bf,stroke-width:2px,color:#ccfbf1;
    classDef alert     fill:#3b0764,stroke:#a855f7,stroke-width:2px,color:#faf5ff;

    %% ── TIER 1 : SENSOR INPUT ────────────────────────────────────────────
    subgraph T1 ["📡 Tier 1 · Multi-Channel HUMS Sensor Telemetry"]
        direction LR
        S1["🌡️ Temperature & Coolant"]:::sensor
        S2["📳 Vibration & RPM"]:::sensor
        S3["🛢️ Oil / Fuel / Hydraulic Pressures"]:::sensor
        S4["🔋 Battery Voltage & Load"]:::sensor
        S5["⏱️ Operating Hours & Ambient"]:::sensor
    end

    %% ── TIER 2 : INGESTION & PROCESSING ──────────────────────────────────
    subgraph T2 ["⚡ Tier 2 · FastAPI Gateway & Feature Pipeline"]
        direction LR
        VAL["✅ Pydantic v2 Schema Validation"]:::api
        FEAT["📐 11-Feature Normalization & Rolling Stats"]:::api
        VAL --> FEAT
    end

    %% ── TIER 3 : ML INFERENCE ENGINE ─────────────────────────────────────
    subgraph T3 ["🧠 Tier 3 · Component ML Inference & Explainability"]
        direction LR
        ANOM["🔍 Anomaly Detection (4 Component Models · RF)"]:::ml
        FAIL["📊 Failure Probability (4 Component Models · RF/XGB)"]:::ml
        SHAP["🩺 SHAP TreeExplainer (Root-Cause Attributions)"]:::ml
        ANOM --> SHAP
        FAIL --> SHAP
    end

    %% ── TIER 4 : OPERATIONAL READINESS ENGINE ────────────────────────────
    subgraph T4 ["🚦 Tier 4 · Scoring & Operational Decision Engine"]
        direction LR
        SCORE["🧮 Composite Health Score (0–100)"]:::readiness
        PRIOR["⚠️ Maintenance Priority Calculation"]:::readiness
        STATUS["🏷️ READY · ATTENTION · NOT_READY"]:::readiness
        SCORE --> PRIOR --> STATUS
    end

    %% ── TIER 5 : PERSISTENCE LAYER ───────────────────────────────────────
    subgraph T5 ["💾 Tier 5 · PostgreSQL Database (Neon / Local)"]
        direction LR
        DB[("💾 assets · components · sensor_readings · predictions<br/>prediction_explanations · asset_status · maintenance_records<br/>readiness_assessments · recommendations · anomalies")]:::db
    end

    %% ── TIER 6 : COMMAND CONSOLE & COPILOT ────────────────────────────────
    subgraph T6 ["🖥️ Tier 6 · Tactical Command Console & Copilot"]
        direction LR
        SEM["🧠 Semantic Intent Engine (TF-IDF + Cosine)"]:::copilot
        LLM["🤖 Groq / IBM Bob Cloud Synthesis"]:::copilot
        UI["🖥️ React 19 Command Console (7 Operational Views)"]:::ui
        NOTIF["🚨 Alert Notifier (SMTP TLS + Brevo Fallback)"]:::alert
        SEM --> LLM
        LLM <-->|Natural Inquests| UI
        NOTIF -.->|Critical Telemetry Alerts| UI
    end

    %% ── VERTICAL FLOW (strictly subgraph → subgraph) ─────────────────────
    T1 -->|"11-Channel Telemetry Stream"| T2
    T2 -->|"Normalized Feature Vectors"| T3
    T2 -->|"Raw Sensor Persistence"| T5
    T3 -->|"Inference & SHAP Importance"| T4
    T4 -->|"Persist Predictions & Readiness Status"| T5
    T5 -->|"Grounded Evidence Context"| T6
    T4 -.->|"Live Readiness & Anomaly Directives"| T6
    T6 -->|"Maintenance Work Orders & Inquests"| T2
```

---

## 🧩 Core System Components

| Layer | Technology | Key Responsibility |
|---|---|---|
| **Command Frontend** | React 19, Vite 8, Lucide React, Oxlint, Vanilla CSS / Tokens | High-contrast tactical command console featuring 7 dedicated views (`Overview`, `Fleet Assets`, `Predictions`, `Trends & Health`, `AI Copilot`, `Reports`, `Settings`) plus drill-down `Asset Inspection` and `Component Analysis`. |
| **Backend REST API** | FastAPI, Uvicorn, Pydantic v2, SQLAlchemy 2.0 | Asynchronous REST service exposing operational endpoints (`/assets`, `/components`, `/telemetry`, `/predictions`, `/anomalies`, `/dashboard`, `/maintenance`, `/command`, `/copilot`, `/chat`, `/auth`). |
| **Machine Learning** | Scikit-learn, XGBoost, SHAP (`TreeExplainer`), Pickle | In-memory `ModelRegistry` serving 8 serialized `.pkl` pipelines for 4 critical components (Engine, Battery, Fuel Pump, Hydraulic System) across anomaly detection and failure probability. |
| **Operational Copilot** | Scikit-learn TF-IDF, Groq API, IBM Bob API | Hybrid conversational copilot with multi-pattern entity extraction (`A021`, `Platform 21`), defense abbreviation expansion (`FMC`, `NMC`, `RUL`), typo tolerance, 15 intent categories, and strict out-of-domain refusal. |
| **Database & ORM** | PostgreSQL 14+ / Neon Serverless PostgreSQL, SQLAlchemy 2.0, Alembic | Relational persistence for asset registries, 20,000+ sensor records, anomaly logs, prediction explanations, trend analyses, and maintenance records. |
| **Defense Notification Engine** | SMTP (TLS), Brevo API Fallback, Python `smtplib` | Dual-channel alerting service (`alert_notifier.py`) strictly enforcing static recipient whitelisting (`sentinelai712@gmail.com`) for anomaly alerts and fleet readiness summaries. |

---

## 🔄 End-to-End Operational Data Flow

```
[ 📡 Sensor Telemetry ] ➔ [ 🧠 8 ML Models & SHAP ] ➔ [ 🚦 Readiness & Health Scoring ] ➔ [ 🔧 Maintenance Orders ] ➔ [ 💬 Grounded Copilot ]
```

1. **Telemetry Ingestion:** 11-channel multi-sensor readings (temperature, vibration, oil pressure, fuel pressure, RPM, hydraulic pressure, battery voltage, coolant temperature, operating hours, load percentage, ambient temperature) are ingested and validated via `/api/v1/telemetry`.
2. **Feature Processing & In-Memory ML Inference:** Telemetry is processed by the feature pipeline (calculating rolling statistics, rate-of-change, and normalization) and evaluated against the component's designated pipeline in `ModelRegistry`:
   - **Anomaly Detection:** Pipeline (StandardScaler + SimpleImputer + RandomForestClassifier) identifies out-of-distribution telemetry patterns.
   - **Failure Probability:** Pipeline (ColumnTransformer + RandomForestClassifier or XGBClassifier) predicts 50-hour failure risk.
   - **SHAP Feature Attribution:** `TreeExplainer` computes exact contribution values and ranks the primary and secondary contributing sensors.
3. **Deterministic Readiness Scoring:** `ScoringService` calculates operational metrics:
   - **Anomaly Severity:** Clamped probability score ($0–100$).
   - **Trend Risk:** Multi-factor trend evaluation incorporating rate-of-change, persistence, and multi-sensor drift ($0–100$).
   - **Health Score:** $100 - (0.50 \times \text{FailureRisk}) - (0.30 \times \text{AnomalySeverity}) - (0.20 \times \text{TrendRisk})$.
   - **Maintenance Priority:** $(0.60 \times \text{FailureRisk}) + (0.25 \times \text{AnomalySeverity}) + (0.15 \times \text{TrendRisk})$ classified into `CRITICAL` ($\ge 80$), `HIGH` ($60–79$), `MEDIUM` ($40–59$), or `LOW` ($< 40$).
   - **Asset Operational Status:** Calculated across all 4 components into `READY`, `ATTENTION` (multiple high-priority or anomalous components), or `NOT_READY` (any critical component).
4. **Maintenance Planning:** Prescriptive recommendations are linked directly to affected subsystems with standardized diagnostic check procedures.
5. **Commander Copilot Inquest:** The `SemanticUnderstandingEngine` routes questions across 15 intent categories, queries PostgreSQL for real-time telemetry and component condition, and synthesizes structured answers via Groq (`openai/gpt-oss-120b`) or IBM Bob (`ibm/granite-3-8b-instruct`), refusing non-platform queries.
6. **Closed-Loop Reassessment:** When maintenance work orders are completed, SentinelAI executes immediate reassessment on updated telemetry to mathematically verify component normalization before clearing the asset.

---

## 🗄️ Database Schema Overview (PostgreSQL)

| Table Name | Primary Entity | Primary Function |
|---|:---:|---|
| `assets` | `Asset` | Fleet equipment registry (asset ID, name, classification, status, creation timestamp). |
| `components` | `Component` | Subsystem registry for each asset (`Engine`, `Battery`, `Fuel Pump`, `Hydraulic System`). |
| `sensor_readings` | `SensorReading` | Chronological multi-channel HUMS telemetry records (11 physical parameters). |
| `anomalies` | `Anomaly` | Detected anomaly events with anomaly score, severity tier, and affected sensors. |
| `predictions` | `Prediction` | Inference records storing failure probability, health score, trend risk, and priority level. |
| `prediction_explanations` | `PredictionExplanation` | SHAP feature attributions, contribution directions, and relative importance ranks. |
| `trend_analysis` | `TrendAnalysis` | Sensor time-series trend evaluations and multi-sensor degradation metrics. |
| `asset_status` | `AssetStatus` | Overall asset operational readiness (`READY`, `ATTENTION`, `NOT_READY`) and component severity counts. |
| `maintenance_records` | `MaintenanceRecord` | Logged maintenance actions, issues detected, parts replaced, and maintenance status. |
| `readiness_assessments` | `ReadinessAssessment` | Historical multi-factor readiness assessments, risk factors, and contributing reasons. |
| `recommendations` | `Recommendation` | Actionable maintenance recommendations prioritized by urgency (`CRITICAL` to `LOW`). |

---

## 🔒 Security & Reliability

- **Single-Administrator Authentication:** Access is secured via bcrypt password verification against configured server secrets (`ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH`), issuing signed HS256 JWT tokens via HTTP-Only session cookies (`sentinel_session`) and `Authorization: Bearer` headers.
- **Strict Out-of-Domain Copilot Boundary:** The conversational engine actively inspects incoming queries and rejects unrelated general topics (jokes, weather, trivia, entertainment) with an explicit SentinelAI defense scope disclaimer.
- **Defense-Grade Notification Whitelisting:** Outbound notifications via SMTP TLS or Brevo API enforce an immutable recipient whitelist (`sentinelai712@gmail.com`), rejecting unapproved target addresses before socket initialization.
- **Zero-Hallucination Grounding:** Inquests retrieve live database records, sensor thresholds, and SHAP feature importances, preventing fabricated readiness metrics or hallucinated telemetry.
- **Automated Verification:** The backend and copilot semantic paraphrase engines are verified by **154/154 passing automated pytest tests**.