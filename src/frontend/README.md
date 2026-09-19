# SentinelAI Frontend Console

Enterprise defense web console for SentinelAI Mission Readiness and Operational Copilot.

## Core Features
- **Tactical Authentication & Landing Page**: Military-themed sign-in with single-admin verification (`sentinelai712@gmail.com`), secure session cookies, and security clearance initializers.
- **Mission Overview Dashboard**: Real-time fleet readiness percentage, operational status distribution (`READY`, `ATTENTION`, `NOT_READY`), and critical component risk queues.
- **Fleet Asset Inventory & Inspection**: Searchable platform grid/table with drill-down `AssetInspectionView` displaying real-time telemetry, 50h failure risks, and subsystem statuses.
- **Deep-Dive Component Analysis**: Dedicated subsystem inspector (`ComponentAnalysisView`) for Engine, Battery, Fuel Pump, and Hydraulic System with chronological telemetry graphs and SHAP root-cause feature attributions.
- **Predictive Horizons View**: 50-hour failure probability rankings, Remaining Useful Life (RUL) estimates, and diagnosed failure modes.
- **Trends & Health View**: Anomaly detection monitoring, multi-sensor variance analysis, and sigma deviation indicators.
- **AI Copilot**: Natural-language conversational interface supporting 15 operational intent categories, Groq (`openai/gpt-oss-120b`) / IBM Bob (`ibm/granite-3-8b-instruct`) cloud synthesis, platform-scoped domain guarding, and direct application navigation.
- **Reports & Export Center**: Filtered client-side CSV dataset downloads containing complete multi-channel sensor telemetry, plus printable tactical PDF report generation.
- **System Settings**: High-contrast theme toggle (Dark / Tactical), backend health monitoring, and in-memory model registry observability.

## Tech Stack
- **Framework**: React 19 + Vite 8
- **Icons**: Lucide React
- **Linter & Tools**: Oxlint
- **Styling**: Modern Tactical UI with responsive CSS tokens (`tokens.css`, `layout.css`, `components.css`, `views.css`)
- **API Client**: Modular fetch client (`src/api/client.js`) with dynamic backend URL resolution (`src/config/api.config.js`)

## Quick Start
```powershell
# Install dependencies
npm install

# Start local development server
npm run dev
```

The application will be available at `http://localhost:5173`.

## Production Build
```powershell
npm run build
npm run preview
```

