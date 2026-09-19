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
- **Natural-Language & Paraphrase Understanding Copilot** — Robust semantic understanding engine routing 15 operational capabilities without keyword gates, multi-pattern entity extraction (`A021`, `Platform 21`, `Unit #21`), defense abbreviation expansion (`FMC`, `NMC`, `RUL`, `HUMS`), typo tolerance, and contextual follow-ups powered by Groq (GPT-OSS / Llama 3.3) and IBM Bob / Granite.
- **Prioritized Maintenance Planning & Closed-Loop Reassessment** — Automatically compiles and ranks interventions by urgency (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), maps affected subsystems, and validates post-maintenance readiness recovery using verified re-assessment workflows.
- **Actionable Failure Resolution Recommendations** — Synthesizes prioritized, deduplicated corrective actions mapped directly to diagnosed failure modes (e.g., subsystem teardowns, component wear inspections, sensor recalibrations, or overhaul schedules) to resolve identified failure risks prior to sortie deployment.

---

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| **Languages** | Python, JavaScript |
| **Frameworks** | FastAPI, React, Scikit-learn |
| **IBM & AI Technologies** | IBM Bob, Groq AI Inference |
| **Databases** | PostgreSQL |
| **Other** | Docker, Git, GitHub, REST APIs, Alembic, Pytest, TF-IDF NLP |

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

- **Single Platform Focus** — Models are currently calibrated for one primary fleet type (tactical aircraft/vehicles). Adding new vehicle or naval classes requires platform-specific retraining.
- **Simulated Sensor Data** — The prototype runs on simulated and open-source telemetry rather than live classified military feeds.
- **Wear vs. Combat Damage** — The system detects progressive mechanical wear (vibration spikes, overheating, pressure loss). It cannot predict sudden battle damage or unexpected physical strikes.
- **Offline Model Updates** — Predictions happen instantly in real time, but model retraining is currently handled offline in batches.
- **Defense-Specific Copilot** — The AI assistant is strictly scoped to fleet operations, telemetry, and maintenance tasks—not general chat.

---

## 🏅 What We're Most Proud Of

- **Real End-to-End ML (Zero Mocks)** — Trained and deployed 4 specialized models (failure risk, RUL forecasting, failure modes, anomaly detection) across 20,000+ telemetry records.
- **Semantic Paraphrase Copilot** — Built an enterprise semantic understanding engine eliminating keyword gates, accurately mapping colloquial questions, defense slang, and coreferences to 15 SentinelAI capabilities.
- **Mission-First Tactical UI** — Designed an intuitive defense console with ranked attention queues, visual readiness tiers, and real-time telemetry charts.
- **Closed-Loop Maintenance** — Completing a work order automatically triggers live sensor reassessment to verify that anomalies cleared and update readiness scores.
- **Production-Grade & 100% Tested** — Built a complete full-stack architecture (React, FastAPI, PostgreSQL, Alembic) verified by 154/154 passing automated paraphrase tests.

---
