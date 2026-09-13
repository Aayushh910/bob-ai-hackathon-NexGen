# 🚀 SentinelAI - Mission Readiness & Predictive Maintenance Copilot

---

## 👥 Team

| Field | Value |
|---|---|
| **Team Name** | NexGen |
| **Track** | Defense & Aerospace |
| **Team Lead** | Aayush Savaliya — 24aiml057@charusat.edu.in |
| **Members** | Jeel Pipaliya, Krish Singh, Jevil Savani |

---

## 🎯 Problem Statement

> In 2–3 sentences: What problem does your project solve? Who experiences this problem?

Military maintenance teams struggle to accurately determine whether aircraft, vehicles, and critical equipment are truly mission-ready because maintenance decisions often rely on fixed schedules and manually analyzed sensor and service data. Our project helps maintenance and operations teams detect early signs of component failure, understand readiness risks, and prioritize maintenance before unexpected failures impact mission availability.

---

## 💡 Solution

> In 2–3 sentences: What did you build? How does it solve the problem above?

MissionGuard is an AI-powered copilot that ingests real-time sensor telemetry and historical maintenance/service records to assess asset mission readiness, detect anomalies, and predict potential component failures. It combines predictive analytics with IBM watsonx.ai and a LangChain-based reasoning layer to explain risks in natural language and generate a prioritized, actionable maintenance plan before failures affect mission availability.

---

## ✨ Key Features

- **Real-Time Sensor Anomaly Detection**  — Detect abnormal patterns in temperature, vibration, pressure, RPM, and other telemetry before they become critical.
- **Predictive Failure & Risk Analysis**  — Estimate which components are most likely to fail and assign a failure-risk score based on sensor trends and historical data.
- **Real-Time Sensor Anomaly Detection** — Automatically classify assets as Ready, At Risk, or Not Mission Ready based on component health and predicted failures.
- **AI-Powered Explainability** — Explain why an asset is at risk, identify the contributing sensor readings and historical maintenance patterns, and present the findings in clear natural language.
- **Prioritized Maintenance Recommendations** — Generate a ranked maintenance plan based on failure risk, mission impact, urgency, and component condition.

---

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| **Languages** | Python, JavaScript |
| **Frameworks** | FastAPI, React, LangChain |
| **IBM Technologies** | IBM watsonx.ai, IBM Bob, IBM Cloud |
| **Databases** | PostgreSQL |
| **Other** | Docker, Git, GitHub, REST APIs |

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

> Be honest — judges appreciate transparency over overclaiming.

- Synthetic/limited sensor data — The prototype uses simulated or publicly available sensor data rather than live military platform telemetry, so real-world performance may differ. Real predictive-maintenance datasets can also have limited failure examples

---

## 🏅 What We're Most Proud Of

[Tell the judges what part of your submission is strongest and worth paying close attention to.]

---
