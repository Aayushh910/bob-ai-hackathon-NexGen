from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.component import Component
from app.models.sensor import SensorReading
from app.models.prediction import Prediction
from app.models.explanation import PredictionExplanation

router = APIRouter()

@router.get(
    "/{component_id}",
    summary="Get component details",
    description="Retrieve details and latest operational status of a specific component."
)
def get_component(
    component_id: str,
    db: Session = Depends(get_db)
):
    comp = db.query(Component).filter(Component.component_id == component_id).first()
    if not comp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Component '{component_id}' not found."
        )

    # Get latest prediction
    latest_pred = (
        db.query(Prediction)
        .filter(Prediction.component_id == component_id)
        .order_by(Prediction.timestamp.desc())
        .first()
    )

    return {
        "component_id": comp.component_id,
        "asset_id": comp.asset_id,
        "component_type": comp.component_type,
        "created_at": comp.created_at,
        "latest_prediction": {
            "timestamp": latest_pred.timestamp if latest_pred else None,
            "anomaly_prediction": latest_pred.anomaly_prediction if latest_pred else None,
            "anomaly_probability": latest_pred.anomaly_probability if latest_pred else None,
            "failure_prediction": latest_pred.failure_prediction if latest_pred else None,
            "failure_probability": latest_pred.failure_probability if latest_pred else None,
            "primary_reason": latest_pred.primary_reason if latest_pred else None,
            "secondary_reason": latest_pred.secondary_reason if latest_pred else None,
            "trend_risk": latest_pred.trend_risk if latest_pred else None,
            "health_score": latest_pred.health_score if latest_pred else None,
            "maintenance_priority": latest_pred.maintenance_priority if latest_pred else None,
            "priority_level": latest_pred.priority_level if latest_pred else None,
        } if latest_pred else None
    }

@router.get(
    "/{component_id}/history",
    summary="Get sensor reading history",
    description="Retrieve chronological sensor telemetry history for a specific component."
)
def get_component_sensor_history(
    component_id: str,
    limit: int = Query(100, ge=1, le=1000, description="Max readings to retrieve"),
    order: str = Query("desc", description="Sort order: 'asc' or 'desc'"),
    db: Session = Depends(get_db)
):
    comp = db.query(Component).filter(Component.component_id == component_id).first()
    if not comp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Component '{component_id}' not found."
        )

    q = db.query(SensorReading).filter(SensorReading.component_id == component_id)
    if order.lower() == "asc":
        q = q.order_by(SensorReading.timestamp.asc())
    else:
        q = q.order_by(SensorReading.timestamp.desc())

    readings = q.limit(limit).all()

    return {
        "component_id": component_id,
        "component_type": comp.component_type,
        "total_records": len(readings),
        "readings": [
            {
                "id": r.id,
                "timestamp": r.timestamp,
                "temperature": r.temperature,
                "vibration": r.vibration,
                "oil_pressure": r.oil_pressure,
                "fuel_pressure": r.fuel_pressure,
                "rpm": r.rpm,
                "hydraulic_pressure": r.hydraulic_pressure,
                "battery_voltage": r.battery_voltage,
                "coolant_temperature": r.coolant_temperature,
                "operating_hours": r.operating_hours,
                "load_percentage": r.load_percentage,
                "ambient_temperature": r.ambient_temperature,
                "sensor_status": r.sensor_status,
                "source_file": r.source_file,
            }
            for r in readings
        ]
    }

@router.get(
    "/{component_id}/predictions",
    summary="Get prediction history",
    description="Retrieve chronological prediction history for a specific component."
)
def get_component_predictions(
    component_id: str,
    limit: int = Query(100, ge=1, le=1000, description="Max predictions to retrieve"),
    order: str = Query("desc", description="Sort order: 'asc' or 'desc'"),
    db: Session = Depends(get_db)
):
    comp = db.query(Component).filter(Component.component_id == component_id).first()
    if not comp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Component '{component_id}' not found."
        )

    q = db.query(Prediction).filter(Prediction.component_id == component_id)
    if order.lower() == "asc":
        q = q.order_by(Prediction.timestamp.asc())
    else:
        q = q.order_by(Prediction.timestamp.desc())

    predictions = q.limit(limit).all()

    return {
        "component_id": component_id,
        "component_type": comp.component_type,
        "total_records": len(predictions),
        "predictions": [
            {
                "id": p.id,
                "timestamp": p.timestamp,
                "anomaly_prediction": p.anomaly_prediction,
                "anomaly_probability": p.anomaly_probability,
                "failure_prediction": p.failure_prediction,
                "failure_probability": p.failure_probability,
                "primary_reason": p.primary_reason,
                "secondary_reason": p.secondary_reason,
                "anomaly_severity": p.anomaly_severity,
                "trend_risk": p.trend_risk,
                "health_score": p.health_score,
                "maintenance_priority": p.maintenance_priority,
                "priority_level": p.priority_level,
                "model_version": p.model_version,
            }
            for p in predictions
        ]
    }

@router.get(
    "/{component_id}/explanation",
    summary="Get latest SHAP explanation",
    description="Retrieve detailed SHAP feature importance and contribution direction for the latest prediction."
)
def get_component_explanation(
    component_id: str,
    db: Session = Depends(get_db)
):
    comp = db.query(Component).filter(Component.component_id == component_id).first()
    if not comp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Component '{component_id}' not found."
        )

    latest_pred = (
        db.query(Prediction)
        .filter(Prediction.component_id == component_id)
        .order_by(Prediction.timestamp.desc())
        .first()
    )

    if not latest_pred:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No predictions found for component '{component_id}'."
        )

    explanations = (
        db.query(PredictionExplanation)
        .filter(PredictionExplanation.prediction_id == latest_pred.id)
        .order_by(PredictionExplanation.rank.asc())
        .all()
    )

    return {
        "component_id": component_id,
        "component_type": comp.component_type,
        "prediction_id": latest_pred.id,
        "timestamp": latest_pred.timestamp,
        "anomaly_prediction": latest_pred.anomaly_prediction,
        "anomaly_probability": latest_pred.anomaly_probability,
        "primary_reason": latest_pred.primary_reason,
        "secondary_reason": latest_pred.secondary_reason,
        "feature_contributions": [
            {
                "feature_name": exp.feature_name,
                "shap_value": exp.shap_value,
                "feature_value": exp.feature_value,
                "contribution_direction": exp.contribution_direction,
                "rank": exp.rank,
            }
            for exp in explanations
        ]
    }
