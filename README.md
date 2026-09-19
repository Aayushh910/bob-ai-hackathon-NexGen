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

SentinelAI is an AI-powered copilot and command intelligence platform that ingests multi-channel Health and Usage Monitoring System (HUMS) telemetry and service histories across military fleet assets. It runs a production machine learning pipeline—featuring 8 component-specific anomaly and failure prediction pipelines (Random Forest and XGBoost across Engine, Battery, Fuel Pump, and Hydraulic System), SHAP TreeExplainer feature attributions, and a deterministic 4-tier readiness engine (`READY`, `CAUTION`, `DEGRADED`, `NOT_READY`). Coupled with a hybrid Semantic Paraphrase Copilot (powered by Groq and IBM Bob with a domain-guarded boundary) and closed-loop maintenance workflows, it translates raw sensor drift into prioritized interventions and plain-language commander intelligence.

---

## ✨ Key Features

- **Component-Specific Predictive Failure Analysis** — Evaluates 50-hour breakdown probabilities and operational risks using dedicated, serialized ML pipelines for critical subsystems (Engine, Battery, Fuel Pump, and Hydraulic System).
- **Multi-Sensor Telemetry Anomaly Detection & SHAP Attributions** — Ingests multi-channel HUMS telemetry (vibration, temperature, oil/fuel/hydraulic pressures, RPM, voltage) and isolates operational anomalies, computing exact SHAP feature attributions and root-cause reasons.
- **Deterministic 4-Tier Readiness & Health Scoring** — Calculates composite health scores ($0–100$) and categorizes assets into `READY`, `CAUTION`, `DEGRADED`, or `NOT_READY` using multi-factor telemetry variance and operational constraints.
- **Natural-Language Semantic Copilot with Out-of-Domain Guarding** — Robust hybrid conversational copilot routing 15 operational intent categories with TF-IDF cosine similarity, defense abbreviation expansion (`FMC`, `NMC`, `RUL`, `HUMS`), typo tolerance, entity extraction (`A021`, `Platform 21`), and Groq / IBM Bob LLM synthesis—with strict platform scope guarding.
- **Prioritized Maintenance Planning & Closed-Loop Work Orders** — Automatically ranks maintenance interventions by urgency (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), maps affected subsystems, and validates post-maintenance readiness recovery.
- **Comprehensive Reporting & Export** — Enables instant client-side CSV dataset downloads with complete sensor telemetry and generates tactical PDF readiness briefs with executive metrics.
- **Restricted Defense Notification Engine** — Integrates a dual-channel alerting service (`alert_notifier.py`) supporting authenticated SMTP TLS and Brevo API fallback with strict static recipient whitelisting.

---

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| **Languages** | Python 3.11, JavaScript (ES Modules) |
| **Backend Framework** | FastAPI, Uvicorn, Pydantic v2, Pydantic Settings |
| **Frontend Console** | React 19, Vite 8, Lucide React, Oxlint, Vanilla CSS / CSS Tokens |
| **Machine Learning** | Scikit-learn, XGBoost, SHAP (TreeExplainer), NumPy, Pandas, Pickle |
| **AI & LLM Providers** | Groq API (`openai/gpt-oss-120b`), IBM Bob API (`ibm/granite-3-8b-instruct`), Scikit-learn TF-IDF Vectorizer |
| **Databases & ORM** | PostgreSQL 14+ / Neon Serverless PostgreSQL, SQLAlchemy 2.0, Alembic |
| **Security & Auth** | Single-Administrator Bcrypt Authentication, JWT Sessions, HTTP-Only Cookie + Bearer Token |
| **Alerting & Notification** | Secure SMTP (TLS), Brevo API Fallback, Static Recipient Whitelisting |
| **Verification & Tools** | Pytest, Docker, Git, GitHub Actions |

---

## 📁 Repository Structure

```
├── src/                  # All source code
│   ├── backend/          # FastAPI application, services, ML registry, database models
│   ├── frontend/         # React 19 + Vite tactical command console
│   └── ML/               # Model training scripts, raw telemetry data, and serialized .pkl pipelines
├── docs/                 # Detailed documentation
│   ├── problem-statement.md
│   ├── solution-overview.md
│   ├── architecture.md
│   └── setup-guide.md
├── demo/                 # Demo artifacts
│   ├── screenshots/      # 7 verified application screenshots
│   ├── demo-video-link.txt  # Link to demo video
│   └── live-demo-url.txt    # Link to live deployed application
├── presentation/         # Slide deck (Slides.pdf)
├── submission.yaml       # Structured hackathon submission metadata
└── render.yaml           # Automated cloud deployment blueprint
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
# Edit .env with your configuration values (DATABASE_URL, GROQ_API_KEY, ADMIN_EMAIL, etc.)
alembic upgrade head

# 4. Seed Telemetry & Fleet Data (Optional)
python scripts/ingest_test_data.py

# 5. Run the project
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
| 📊 Presentation | [See presentation/Slides.pdf](presentation/Slides.pdf) |

---

## ⚠️ Known Limitations

- **Single Platform Calibration** — Predictive models and degradation baselines are currently calibrated for one primary fleet class (tactical aircraft/combat vehicles). Adding distinct maritime or armored platforms requires platform-specific telemetry schemas and retraining.
- **Simulated HUMS Telemetry** — The platform is demonstrated using simulated and open-source multi-channel sensor feeds rather than live classified military data streams.
- **Wear Degradation vs. Kinetic Trauma** — The system detects progressive mechanical wear and anomalous telemetry drift (thermal spikes, vibration instability, pressure decay). It does not predict instantaneous kinetic strikes or sudden battle damage.
- **In-Memory Inference with Batch Retraining** — Production inference runs in real time via an in-memory `ModelRegistry`, but model retraining is executed offline in batch cycles.
- **Strictly Scoped Defense Copilot** — The AI copilot is strictly bounded to fleet operations, telemetry diagnostics, and maintenance workflows. It deliberately refuses casual out-of-domain queries (e.g., jokes, weather, general trivia) with an explicit platform scope disclaimer.

---

## 🏅 What We're Most Proud Of

- **Real End-to-End ML (Zero Mocks)** — Trained and deployed 8 component-specific anomaly and failure prediction pipelines (`.pkl` format) with SHAP TreeExplainer feature attributions across 20,000+ telemetry records.
- **Semantic Paraphrase Copilot** — Engineered a hybrid semantic understanding engine with TF-IDF cosine similarity, handling colloquial phrases, defense terminology (`FMC`, `NMC`, `RUL`), and follow-ups across 15 operational intents.
- **Mission-First Tactical UI** — Designed a high-contrast defense command console with 7 dedicated operational views, interactive anomaly deviation charts, and drill-down component analysis.
- **Closed-Loop Maintenance Lifecycle** — Implemented maintenance work order workflows where service completion updates records and reassesses operational readiness.
- **Cloud-Native & Fully Tested** — Architected for zero-friction cloud deployment on Vercel (Frontend) and Render (Backend) backed by Neon Serverless PostgreSQL, validated by 154/154 passing automated tests.

---
