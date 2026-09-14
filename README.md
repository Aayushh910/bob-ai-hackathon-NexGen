# 🚀 SentinelAI - An AI-powered mission-readiness and predictive-maintenance copilot

---

## 👥 Team

| Field | Value |
|---|---|
| **Team Name** | NexGen |
| **Track** | AI |
| **Team Lead** | Aayush Savaliya — 24aiml057@charusat.edu.in |
| **Members** | Jeel Pipaliya, Krish Singh, Jevil Savani |

---

## 🎯 Problem Statement

> In 2–3 sentences: What problem does your project solve? Who experiences this problem?

Military maintenance and operations teams struggle to accurately determine whether aircraft, vehicles, and critical equipment are truly mission-ready because maintenance decisions often rely on fixed schedules and manually analyzed sensor and service data. SentinelAI helps these teams detect early signs of equipment degradation and component failure, assess mission-readiness risks, and prioritize maintenance before unexpected failures reduce operational availability.

---

## 💡 Solution

> In 2–3 sentences: What did you build? How does it solve the problem above?

SentinelAI is an AI-powered copilot that ingests Health and Usage Monitoring System (HUMS) multi-sensor telemetry and service histories across military fleet assets. It runs a production machine learning pipeline (Random Forest failure probability, Extra Trees RUL regression, failure mode classification, and Isolation Forest anomaly detection) to classify assets into a 4-tier readiness framework (`READY`, `CAUTION`, `DEGRADED`, `NOT_READY`). Coupled with an evidence-backed Operational Copilot and a closed-loop maintenance scheduler, it translates sensor drift into prioritized interventions and plain-language commander intelligence before mechanical failures ground critical missions.

---

## ✨ Key Features

- **Multi-Model Predictive Failure & RUL Analysis** — Deploys dedicated ML models (Random Forest classifier & Extra Trees regressor) to compute 50-hour failure probabilities, Remaining Useful Life (RUL) in operating hours, and specific failure modes (e.g., pressure drop, bearing wear, overheating).
- **Multi-Sensor Telemetry Anomaly Detection** — Ingests multi-channel HUMS telemetry (vibration, temperature, oil/fuel/hydraulic pressure, RPM, voltage) and isolates real-time operational deviations using an Isolation Forest engine.
- **4-Tier Deterministic Readiness Assessment** — Evaluates fleet assets on an explainable 0–100 readiness score and categorizes them into `READY`, `CAUTION`, `DEGRADED`, or `NOT_READY` based on multi-factor telemetry health and operational constraints.
- **Prioritized Maintenance Planning & Closed-Loop Reassessment** — Automatically compiles and ranks interventions by urgency (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), maps affected subsystems, and validates post-maintenance readiness recovery using verified re-assessment workflows.
- **Actionable Failure Resolution Recommendations** — Synthesizes prioritized, deduplicated corrective actions mapped directly to diagnosed failure modes (e.g., subsystem teardowns, component wear inspections, sensor recalibrations, or overhaul schedules) to resolve identified failure risks prior to sortie deployment.

---

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| **Languages** | Python, JavaScript |
| **Frameworks** | FastAPI, React, Scikit-learn |
| **IBM Technologies** | IBM Bob |
| **Databases** | PostgreSQL |
| **Other** | Docker, Git, GitHub, REST APIs, Alembic, Pytest |

---

## 📁 Repository Structure

```
├── src/                  # All source code
├── docs/                 # Written documentation
│   ├── problem-statement.md
│   ├── solution-overview.md
│   ├── architecture.md
│   └── setup-guide.md
├── demo/                 # Demo artifacts
│   ├── screenshots/      # App screenshots
│   └── demo-video-link.txt  # Link to demo video
├── presentation/         # Slide deck
└── submission.yaml       # Structured submission metadata
```

---

## ⚡ How to Run

> **Copy these exact steps from your [`docs/setup-guide.md`](docs/setup-guide.md)**

```bash
# 1. Clone the repo
git clone https://github.com/Aayushh910/bob-ai-hackathon-NexGen.git
cd bob-ai-hackathon-NexGen

# 2. Install dependencies
# Backend
cd src/backend && pip install -r requirements.txt
# Frontend
cd ../frontend && npm install

# 3. Configure environment
cd ../backend
cp .env.example .env
# Edit .env with your values
alembic upgrade head

# 4. Run the project
# Terminal 1 (Backend):
cd src/backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# Terminal 2 (Frontend):
cd src/frontend && npm run dev
```

---

## 🖥️ Demo

| Artifact | Link |
|---|---|
| 📹 Demo Video | [See demo/demo-video-link.txt](demo/demo-video-link.txt) |
| 🌐 Live Demo | [See demo/live-demo-url.txt](demo/live-demo-url.txt) |
| 🖼️ Screenshots | [See demo/screenshots/](demo/screenshots/) |
| 📊 Presentation | [See presentation/slides.pdf](presentation/) |

---

## ⚠️ Known Limitations


- **Single Fleet / Platform Type Specialization** — Due to model complexity, divergent telemetry baselines, and limited multi-platform failure data, the predictive models and degradation curves are currently built and calibrated for a single fleet type (tactical aircraft/vehicle platform). Extending to heterogeneous vehicle or vessel classes requires platform-specific sensor schema mapping and dedicated model retraining.

- **Synthetic/limited sensor data** — The prototype uses simulated or publicly available sensor data rather than live military platform telemetry, so real-world performance may differ. Real predictive-maintenance datasets can also have limited failure examples

- **Predictive Scope vs. Combat Trauma**: The system is engineered to detect progressive mechanical fatigue and wear (thermal spikes, pressure drops, bearing degradation). It cannot anticipate sudden battle damage, kinetic strikes, or structural failures that occur without prior telemetry warning.

- **Offline Retraining Boundary**: Runtime inference is instantaneous via an in-memory `ModelRegistry` in FastAPI, but model training and hyperparameter updates currently operate as an offline batch process rather than continuous on-device edge learning.

- **Scoped Domain Querying (Not a General-Purpose Chatbot)**: AI copilot is focused on defense fleet operations and maintenance. It uses asset telemetry, failure risks, readiness data, and maintenance history to provide grounded recommendations. It does not answer general or unrelated questions outside the supported fleet data and operational tasks.

---

## 🏅 What We're Most Proud Of

- **End-to-End ML Pipeline with Zero Mocks** — Instead of static mock data or generic prompts, we engineered, trained, and served 4 specialized models (Random Forest failure classifier, Extra Trees RUL regressor, failure mode classifier, and Isolation Forest anomaly detector) with strict target-leakage audits across 20,000+ telemetry records.

- **Human-Centered, Mission-First User Experience** — Designed the entire interface to minimize cognitive overload in high-stress operational environments, replacing overwhelming raw data dumps with ranked attention queues, clear visual readiness tiers, and one-click diagnostics.

- **Closed-Loop Maintenance & Verified Reassessment** — Maintenance isn't treated as a static to-do list. When an operator marks an intervention complete, SentinelAI immediately executes post-service inference to verify that sensor anomalies have cleared and objectively recalculates the asset's readiness score.

- **Production-Grade Architecture & 100% Test Pass Rate** — We built a robust, enterprise-ready full-stack system—combining a modern React command console, high-performance FastAPI backend, and PostgreSQL with Alembic migrations—backed by a comprehensive test suite of 45/45 passing automated pytest tests.

---
