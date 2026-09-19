# SentinelAI Frontend Console

Enterprise defense web console for SentinelAI Mission Readiness and Operational Copilot.

## Core Features
- **Executive Command Dashboard**: Real-time fleet readiness indices, composite risk ranking, and operational status queues.
- **Command Copilot**: Natural-language conversational interface supporting free-form commander inquests, entity drill-downs, and evidence-grounded answers.
- **Fleet Asset Inventory**: Detailed platform status cards with subsystem diagnostics (`READY`, `CAUTION`, `DEGRADED`, `NOT_READY`).
- **Telemetry & Sensor Monitoring**: Multi-channel HUMS telemetry inspection (vibration, temperature, pressures, RPM, voltage) with interactive anomaly indicators.
- **Predictive Maintenance Center**: Prioritized intervention schedules and one-click closed-loop reassessment verification.

## Tech Stack
- **Framework**: React 19 + Vite 8
- **Icons**: Lucide React
- **Linter & Tools**: Oxlint
- **Styling**: Modern Tactical UI with responsive dark theme

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
