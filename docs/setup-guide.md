# Setup Guide

> **This file is read by the automated evaluation pipeline. Be precise and complete.**

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- [x] **Python 3.11+** (Python 3.11 or 3.12 recommended; includes `pip` and `venv`)
- [x] **Node.js 18+ & npm 9+** (Node.js 20 LTS recommended for Vite 6/React 19)
- [x] **PostgreSQL 14+** (Local service running on port `5432` or via Docker container)
- [x] **Git** (Command-line Git client)

> 💡 **Tip (Docker for PostgreSQL):** If you do not have PostgreSQL installed locally, you can start a PostgreSQL 14 instance in one command:
> ```bash
> docker run --name sentinel-postgres -e POSTGRES_DB=SentinelAI -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:14
> ```

---

## Environment Variables

SentinelAI provides pre-configured template files for both the backend and frontend.

### 1. Backend Environment Configuration

Copy `src/backend/.env.example` to `src/backend/.env`:

```bash
cp src/backend/.env.example src/backend/.env
# On Windows PowerShell:
# Copy-Item src/backend/.env.example src/backend/.env
```

| Variable | Description | Default / Example Value | Required |
|---|---|---|:---:|
| `APP_NAME` | Name of the application | `SentinelAI` | Yes |
| `APP_ENV` | Application runtime environment | `development` | Yes |
| `DEBUG` | Enable FastAPI debug mode | `True` | Yes |
| `DATABASE_HOST` | PostgreSQL host address | `localhost` | Yes |
| `DATABASE_PORT` | PostgreSQL listening port | `5432` | Yes |
| `DATABASE_NAME` | PostgreSQL database name | `SentinelAI` | Yes |
| `DATABASE_USER` | PostgreSQL user | `postgres` | Yes |
| `DATABASE_PASSWORD` | PostgreSQL user password | `postgres` (or your password) | Yes |
| `FRONTEND_URL` | Allowed CORS origin for frontend | `http://localhost:5173` | Yes |
| `API_PREFIX` | Versioned REST API route prefix | `/api/v1` | Yes |
| `JWT_SECRET_KEY` | Secret key used for JWT signing | `your_jwt_secret_key_here` | Yes |
| `JWT_ALGORITHM` | Encryption algorithm for token encoding | `HS256` | Yes |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiration duration | `1440` (24 hours) | Yes |

### 2. Frontend Environment Configuration

Copy `src/frontend/.env.example` to `src/frontend/.env`:

```bash
cp src/frontend/.env.example src/frontend/.env
# On Windows PowerShell:
# Copy-Item src/frontend/.env.example src/frontend/.env
```

| Variable | Description | Default / Example Value | Required |
|---|---|---|:---:|
| `VITE_API_BASE_URL` | Target FastAPI backend URL | `http://localhost:8000` | Yes |
| `VITE_APP_TITLE` | Application title display | `SentinelAI` | Yes |
| `VITE_APP_ENV` | Frontend runtime environment | `development` | Yes |

---

## Installation

Follow these step-by-step commands from the repository root:

```bash
# 1. Clone the repository
git clone https://github.com/Aayushh910/bob-ai-hackathon-NexGen.git
cd bob-ai-hackathon-NexGen

# 2. Set up Backend Python Virtual Environment
cd src/backend
python -m venv venv

# Activate Virtual Environment:
# On Linux / macOS:
source venv/bin/activate
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On Windows Command Prompt (CMD):
venv\Scripts\activate.bat

# Install Backend Dependencies
pip install -r requirements.txt

# 3. Set up Frontend Dependencies
cd ../frontend
npm install

# 4. Initialize Database Schema & Run Migrations
# Return to the backend directory with your virtual environment active:
cd ../backend
alembic upgrade head

# 5. Ingest Telemetry Dataset (20,000+ sensor records across 50 assets)
python scripts/ingest_csv.py
```

---

## Running the Application

SentinelAI runs as two concurrent services: the FastAPI backend service and the React 19 / Vite command console.

### 1. Start the Backend API Service

From the `src/backend` directory (with virtual environment activated):

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend REST API and automated interactive documentation will be available at:
- **API Health Check**: `http://localhost:8000/api/v1/health`
- **Swagger UI Interactive Docs**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`

### 2. Start the Frontend Command Console

From the `src/frontend` directory in a new terminal:

```bash
npm run dev
```

The application frontend will be available at: `http://localhost:5173`

---

## Running Tests

SentinelAI comes with an automated test suite verifying data validation, ML inference, readiness scoring, and API endpoints (45/45 passing tests).

### Automated Backend & Integration Tests

From the `src/backend` directory with your virtual environment activated:

```bash
pytest tests/ -v
```

To run with full output and timing:

```bash
pytest tests/ -v --tb=short
```

### Machine Learning Model Evaluation

To run test-set evaluation across all 4 production models (Failure Probability, RUL, Failure Mode, and Anomaly Detection):

```bash
python src/ML/evaluate.py
```

---

## Quick Demo (Optional)

To quickly showcase SentinelAI's capabilities end-to-end:

### 1. Ingest Sensor Data & Seed Fleet Registry
```bash
# From src/backend:
python scripts/ingest_csv.py
```
This populates PostgreSQL with 50 military fleet assets and 20,000+ multi-sensor telemetry readings.

### 2. Run Sample In-Memory ML Inference
```bash
# From repo root:
python src/ML/predict.py
```
Outputs immediate multi-model predictions (failure likelihood, estimated RUL hours, diagnosed failure mode) for sample flight telemetry.

### 3. Open the Interactive Command Interface
Open your browser and navigate to:
- **Command Console Dashboard**: `http://localhost:5173`
  - View real-time 4-tier readiness matrix (`READY`, `CAUTION`, `DEGRADED`, `NOT_READY`).
  - Inspect fleet health KPI cards and sensor telemetry charts.
  - Interact with the evidence-grounded Operational Copilot.
- **Interactive REST Swagger**: `http://localhost:8000/docs`
  - Test `/api/v1/readiness` to see real-time readiness scoring.
  - Test `/api/v1/copilot/query` to ask mission-readiness questions.

---

## Production Deployment Guide

SentinelAI is architected for cloud-native deployment with zero friction:

| Component | Cloud Platform | Live Deployment URL | Deployment Configuration |
|---|---|---|---|
| **Frontend Console** | **Vercel** | [https://sentinel-ai-ibm-bob.vercel.app](https://sentinel-ai-ibm-bob.vercel.app) | `src/frontend/vercel.json` |
| **Backend REST API** | **Render** | [https://bob-ai-hackathon-nexgen.onrender.com](https://bob-ai-hackathon-nexgen.onrender.com) | `render.yaml` / `Procfile` |
| **Database** | **Neon PostgreSQL** | Serverless Pooled Cluster (Ohio `us-east-2`) | `alembic upgrade head` |

### Pre-Configured Administrator Credentials
- **Official Email**: `sentinelai712@gmail.com`
- **Security Password**: `Admin@712`
- **Pre-computed Hash**: `$2b$12$A0XvgK4RCBVt.FxxPWoSxenOJ2GbEGAwOtJ7pc1pII0AODD4d84KW`

---

### 1. Deploying Backend to Render

SentinelAI includes automated Blueprint specification via `render.yaml`:

#### Option A: 1-Click Blueprint (Recommended)
1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** → **Blueprint**.
3. Connect the repository: `https://github.com/Aayushh910/bob-ai-hackathon-NexGen`.
4. Render automatically reads `render.yaml` from the root directory and configures:
   - **Root Directory**: `src/backend`
   - **Build Command**: `pip install -r requirements.txt && alembic upgrade head`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 2`
   - **Health Check Path**: `/health`
5. Fill in the prompted secret values:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string with `?sslmode=require`.
   - `GROQ_API_KEY`: Your Groq inference key.
6. Click **Apply**.

#### Option B: Manual Web Service
- **Runtime**: Python 3.11+
- **Root Directory**: `src/backend`
- **Build Command**: `pip install -r requirements.txt && alembic upgrade head`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 2`
- **Health Check Path**: `/health`
- **Environment Variables**:
  ```ini
  APP_NAME=SentinelAI
  APP_ENV=production
  DEBUG=false
  DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
  FRONTEND_URL=https://sentinel-ai-ibm-bob.vercel.app
  CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://sentinel-ai-ibm-bob.vercel.app
  CORS_ORIGIN_REGEX=https://.*\.(vercel\.app|onrender\.com|netlify\.app|pages\.dev)
  ADMIN_EMAIL=sentinelai712@gmail.com
  ADMIN_PASSWORD_HASH=$2b$12$A0XvgK4RCBVt.FxxPWoSxenOJ2GbEGAwOtJ7pc1pII0AODD4d84KW
  JWT_SECRET_KEY=generate_strong_random_secret_with_openssl_rand_hex_32
  GROQ_API_KEY=your_groq_api_key_here
  GROQ_MODEL=openai/gpt-oss-120b
  ```

---

### 2. Deploying Frontend to Vercel

1. Log in to [Vercel Dashboard](https://vercel.com/).
2. Click **Add New...** → **Project**.
3. Import the repository `https://github.com/Aayushh910/bob-ai-hackathon-NexGen`.
4. Configure the Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click `Edit` and choose `src/frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add Environment Variable:
   - `VITE_API_BASE_URL`: `https://bob-ai-hackathon-nexgen.onrender.com`
6. Click **Deploy**. Vercel automatically deploys with SPA rewrites via `src/frontend/vercel.json`.

---

## Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| `ConnectionRefusedError: [Errno 111] Connecting to localhost:5432` | PostgreSQL service is not running or port 5432 is blocked | Verify PostgreSQL is running locally, or start the Docker container: `docker run --name sentinel-postgres -e POSTGRES_DB=SentinelAI -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:14` |
| `FATAL: database "SentinelAI" does not exist` | Database has not been created yet in PostgreSQL | Create the database using PostgreSQL CLI: `psql -U postgres -c "CREATE DATABASE \"SentinelAI\";"` |
| `ModuleNotFoundError: No module named 'app'` or missing packages | Virtual environment not activated or dependencies missing | Activate the virtual environment (`source venv/bin/activate` or `.\venv\Scripts\Activate.ps1`) and run `pip install -r requirements.txt`. |
| `Alembic: Target database is not up to date` | Pending database schema migrations | Run `alembic upgrade head` from `src/backend`. |
| `CORS Error in Browser Console` | Backend does not allow the frontend origin | Check `FRONTEND_URL=http://localhost:5173` in `src/backend/.env` and restart the backend. |
| `Port 8000 or 5173 already in use` | Another process is holding the port | Terminate the occupying process or specify an alternate port: `uvicorn app.main:app --port 8001` (update `VITE_API_BASE_URL` in `src/frontend/.env` accordingly). |
| `npm ERR! code ERESOLVE` | Node/npm dependency resolution conflict | Run `npm install --legacy-peer-deps` inside `src/frontend`. |
| `FileNotFoundError: Model artifact not found` | Models have not been trained or moved | Production models are pre-bundled under `src/ML/Models/`. You can also retrain them at any time with `python src/ML/train.py`. |
