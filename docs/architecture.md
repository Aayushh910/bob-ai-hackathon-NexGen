# Architecture

## System Architecture

# MissionGuard — System Architecture

```mermaid
graph TD

    subgraph Frontend [React / JavaScript]
        UI_Dashboard[Mission Readiness Dashboard]
        UI_Assets[Asset & Component Health]
        UI_Sensors[Sensor Telemetry]
        UI_Risk[Failure Risk Analysis]
        UI_Maintenance[Maintenance Recommendations]
        UI_Copilot[MissionGuard AI Copilot]
    end

    subgraph Backend [FastAPI / Python]
        API[FastAPI REST API]
        Ingestion[Sensor Data Ingestion]
        Analysis[Asset Health Analysis]
        Prediction[Failure Risk Prediction]
        Readiness[Mission Readiness Engine]
        Copilot[AI Copilot Service]
    end

    subgraph Data_Processing [Pandas / NumPy]
        Cleaning[Data Cleaning]
        Processing[Data Preprocessing]
        Features[Feature Engineering]
    end

    subgraph ML [scikit-learn]
        Anomaly[Anomaly Detection]
        Failure[Failure Risk Prediction]
        Health[Component Health Score]
    end

    subgraph AI [LangChain / IBM watsonx.ai]
        Workflow[LangChain Workflow]
        Context[Context & Prompt Processing]
        Watson[IBM watsonx.ai]
        Output[Structured AI Output]
        Explanation[Risk Explanation]
        Recommendation[Maintenance Recommendation]
    end

    subgraph Database [SQLite]
        Assets[(Assets)]
        Sensors[(Sensor Readings)]
        Components[(Components)]
        Maintenance[(Maintenance Records)]
        Predictions[(Predictions & Risk Scores)]
    end

    UI_Dashboard -->|REST API| API
    UI_Assets -->|REST API| API
    UI_Sensors -->|REST API| API
    UI_Risk -->|REST API| API
    UI_Maintenance -->|REST API| API
    UI_Copilot -->|REST API| API

    API --> Ingestion
    API --> Analysis
    API --> Prediction
    API --> Readiness
    API --> Copilot

    Ingestion --> Cleaning
    Cleaning --> Processing
    Processing --> Features

    Features --> Anomaly
    Features --> Failure
    Features --> Health

    Anomaly --> Prediction
    Failure --> Prediction
    Health --> Readiness

    Prediction --> Readiness

    Copilot --> Workflow
    Workflow --> Context
    Context --> Watson
    Watson --> Output

    Output --> Explanation
    Output --> Recommendation

    Readiness --> Workflow
    Prediction --> Workflow
    Analysis --> Workflow

    API --> Assets
    API --> Sensors
    API --> Components
    API --> Maintenance
    API --> Predictions

    Assets --> Analysis
    Sensors --> Ingestion
    Components --> Analysis
    Maintenance --> Analysis
    Predictions --> Copilot
```
## Components

| Component | Technology | Responsibility |
|---|---|---|
| Frontend | React / JavaScript | Mission readiness dashboard, sensor visualization, risk status, maintenance recommendations, AI Copilot interface |
| Backend API | FastAPI / Python | API endpoints, data processing orchestration, readiness assessment, ML integration, Copilot integration |
| Data Processing | Pandas / NumPy | Cleaning, preprocessing, transformation, and feature engineering of sensor and maintenance data |
| AI / ML | scikit-learn | Sensor anomaly detection, component health scoring, and failure-risk prediction |
| AI Orchestration | LangChain | Connecting asset data, ML results, prompts, and the AI Copilot workflow |
| LLM | IBM watsonx.ai | Natural-language reasoning, risk explanation, and maintenance recommendation generation |
| Database | SQLite | Storing asset information, sensor readings, component data, maintenance records, and prediction results |
| Development | IBM Bob | AI-assisted development, code generation, debugging, and development workflow |
| Version Control | Git / GitHub | Source-code version control and project submission |

## Data Flow

1. Sensor telemetry and historical maintenance records are provided to the FastAPI backend.
2. Pandas and NumPy clean, preprocess, and transform the incoming sensor and maintenance data.
3. Processed sensor data is passed to scikit-learn models for anomaly detection, component health scoring, and failure-risk prediction.
4. The resulting anomaly indicators and failure-risk scores are combined by the Mission Readiness Engine to classify the asset as Ready, At Risk, or Not Mission Ready.
5. The asset condition, ML results, and relevant maintenance history are passed to a LangChain workflow.
6. LangChain prepares the relevant context and prompt for IBM watsonx.ai.
7. IBM watsonx.ai generates a natural-language explanation of the identified risk and recommends prioritized maintenance actions.
8. Asset data, sensor readings, maintenance records, and prediction results are stored in SQLite.
9. FastAPI exposes the processed results to the React frontend.
10. The React dashboard displays mission readiness, sensor anomalies, failure risks, explanations, and prioritized maintenance recommendations.

## Security Considerations

- API credentials and IBM watsonx.ai credentials are stored in environment variables and are never committed to GitHub.
- Sensitive configuration values are excluded from version control using `.gitignore`.
- Backend API access is separated from frontend presentation through FastAPI endpoints.
- Input data is validated before being processed by the backend and ML pipeline.
- The prototype does not use real classified military data or operational military telemetry.

## Scalability Notes

The hackathon prototype uses SQLite and a single FastAPI backend for simplicity. For production deployment, the database could be migrated to a scalable relational database, FastAPI services could be horizontally scaled, and sensor ingestion and ML inference could be separated into independent services. The ML pipeline could also be optimized for high-volume streaming telemetry, while LangChain and watsonx.ai requests could use asynchronous processing and caching to handle larger workloads.