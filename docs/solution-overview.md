# 🛡️ SentinelAI — Solution Overview

> **Autonomous Mission Readiness & Predictive Maintenance Copilot for Defense Fleets**

---

## 💡 What We Built

In military aviation and fleet operations, maintenance typically suffers from a critical flaw: **it happens either too early (wasting budget and grounding healthy equipment) or too late (causing dangerous in-flight failures).**

**SentinelAI** solves this by turning raw equipment telemetry into proactive mission readiness. It monitors real-time sensors (temperature, vibration, pressures, RPM, voltage), predicts mechanical failures up to 50 hours in advance, isolates telemetry anomalies with SHAP feature attributions, and gives commanders instant, evidence-backed answers on which assets are safe to deploy.

---

### ⚔️ Previous Traditional System vs. SentinelAI Copilot

| Capability | ❌ Previous Traditional System | 🛡️ Our SentinelAI System |
|---|---|---|
| **Maintenance Trigger** | Fixed calendar days or after equipment breaks down | Condition-based: triggered by real sensor wear & early trends |
| **Failure Warning** | None — surprise failures occur mid-sortie | Predicts component failure risk up to 50 operating hours ahead |
| **Readiness Visibility** | Basic binary flag: "Available" or "Grounded" | Nuanced Scale: `READY`, `ATTENTION`, and `NOT_READY` with composite scores |
| **Decision Making** | Hours spent reviewing manual paperwork & logs | Instant natural-language answers backed by sensor evidence |
| **Post-Repair Check** | Assumed ready as soon as paperwork is signed | Closed-loop: re-tests sensor telemetry before clearing flight |

---

## ⚡ How It Works

SentinelAI operates through an end-to-end, 5-stage closed-loop pipeline:

```
[ 📡 Sensor Streams ] ➔ [ 🧠 8 Component ML Models & SHAP ] ➔ [ 🚦 Readiness & Health Scoring ] ➔ [ 🔧 Work Orders ] ➔ [ ✅ Verified Recovery ]
```

1. **📡 Real-Time Telemetry Ingestion**  
   Continuously ingests 11-channel multi-sensor feeds (temperature, vibration, oil pressure, fuel pressure, RPM, hydraulic pressure, battery voltage, coolant temperature, operating hours, load percentage, ambient temperature).

2. **🧠 Multi-Model AI Inferences & SHAP Attributions**  
   Incoming data simultaneously runs through 8 component-specific machine learning pipelines across 4 critical subsystems (Engine, Battery, Fuel Pump, Hydraulic System):
   - **Anomaly Detection Pipelines** (*Random Forest Classifiers*): Detects abnormal sensor patterns and multi-channel telemetry drift.
   - **Failure Probability Pipelines** (*Random Forest & XGBoost Classifiers*): Calculates the likelihood of breakdown within 50 operating hours.
   - **SHAP Feature Importance Engine** (*TreeExplainer*): Diagnoses the exact root-cause sensors driving risk (e.g., oil pressure drop, bearing vibration, thermal spikes).

3. **🚦 Operational Readiness & Health Scoring**  
   Translates complex ML predictions and trend risks into clear operational status:
   - 🟢 **READY (Score 80–100):** Nominal telemetry. All subsystems healthy; cleared for unrestricted deployment.
   - 🟡 **ATTENTION (Score 60–79):** Moderate telemetry drift or multiple high-priority components; pre-staged for technical inspection.
   - 🔴 **NOT_READY (Score 0–59):** Critical failure risk ($\ge 80$ priority) on any primary component. **Grounded immediately** for repairs.

4. **🔧 Prioritized Action Plans**  
   Automatically compiles deduplicated, ranked maintenance work orders (`CRITICAL` to `LOW` urgency) detailing the exact target component and standardized diagnostic procedures.

5. **🔄 Closed-Loop Reassessment**  
   When maintenance is marked complete, SentinelAI runs a fresh telemetry check to mathematically verify that sensor readings have normalized before returning the asset to `READY` status.

---

## 🏛️ Architecture Diagram

> See [`architecture.md`](architecture.md) for complete database schema and API documentation.

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

## 🎯 Key Design Decisions

> [!NOTE]
> **Why Deterministic Evidence Over Open-Ended Chat?**  
> In military operations, an AI that hallucinates or guesses can cost lives. Our Copilot answers commander questions using verifiable database telemetry and exact threshold citations—delivering reliable, audit-ready intelligence.

- **Zero-Latency In-Memory Models:** All 8 trained component models load into FastAPI memory on startup (`ModelRegistry`), providing instant predictions without external runtime overhead.
- **Evidence-Backed Answers:** When the Copilot explains an asset's risk, it provides exact telemetry citations (e.g., *"Engine oil pressure dropped to 42.1 psi, failure probability 78.4%"*).
- **Strict Data Leakage Prevention:** Post-repair details and future dates were strictly excluded during ML training, guaranteeing that models predict failures purely from real-time sensor signatures.
- **Closed-Loop Verification:** Readiness status is tied directly to verified post-maintenance sensor health, preventing assets from being cleared prematurely.
- **Out-of-Domain Protection:** Strict domain enforcement intercepts unrelated general queries (jokes, weather, trivia) and issues a concise SentinelAI platform scope notice.

---

## 🔵 IBM Technologies Used

### **IBM Bob — Machine Learning Model Development & LLM Synthesis**
We used **IBM Bob** as our core AI development accelerator to:
- **Engineer & Tune the ML Pipeline:** Guided feature engineering across 11 physical sensor channels, structured our 8-model component hierarchy, and calibrated SHAP TreeExplainer attributions.
- **Model Training & Leakage Prevention:** Assisted in training, validating, and comparing candidate models (Random Forest, XGBoost) to ensure zero data leakage.
- **Granite LLM Synthesis:** Powered grounded operational chat responses via the IBM Bob API (`ibm/granite-3-8b-instruct`), with Groq cloud inference integration.

---

## ⚠️ Known Limitations

- **Single Fleet / Platform Type Specialization** — Due to model complexity, divergent telemetry baselines, and limited multi-platform failure data, the predictive models and degradation curves are currently built and calibrated for a single fleet type (tactical aircraft/combat vehicle platform). Extending to heterogeneous vehicle or vessel classes requires platform-specific sensor schema mapping and dedicated model retraining.
- **Synthetic / Limited Sensor Data** — The prototype uses simulated or publicly available sensor telemetry rather than live operational defense feeds. Real predictive-maintenance datasets often exhibit scarce positive failure examples.
- **Predictive Scope vs. Combat Trauma** — The system is engineered to detect progressive mechanical fatigue and wear (thermal spikes, pressure drops, bearing degradation). It cannot anticipate sudden combat trauma, kinetic strikes, or structural failures that occur without prior telemetry warning.
- **Offline Retraining Boundary** — Runtime inference is instantaneous via an in-memory `ModelRegistry`, but model retraining and hyperparameter updates currently operate as an offline batch process.
- **Scoped Domain Querying (Not a General-Purpose Chatbot)** — The operational copilot is strictly grounded in defense fleet maintenance, telemetry, and readiness data. It explicitly refuses general or unrelated questions outside supported fleet data.



