from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.models.asset import Asset
from app.models.component import Component
from app.models.status import AssetStatus
from app.models.prediction import Prediction

router = APIRouter()

@router.get(
    "",
    summary="List all fleet assets",
    description="Retrieve list of assets with their latest operational readiness status."
)
def list_assets(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (READY, ATTENTION, NOT_READY)"),
    search: Optional[str] = Query(None, description="Search asset_id or asset_name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    # Fetch all assets
    q = db.query(Asset)
    if search:
        s_pat = f"%{search.strip()}%"
        q = q.filter((Asset.asset_id.ilike(s_pat)) | (Asset.asset_name.ilike(s_pat)))

    total = q.count()
    assets = q.order_by(Asset.asset_id.asc()).offset(skip).limit(limit).all()

    # Get latest status for retrieved assets
    asset_ids = [a.asset_id for a in assets]
    status_map = {}
    if asset_ids:
        st_rows = (
            db.query(AssetStatus.asset_id, AssetStatus.status, AssetStatus.critical_component_count, AssetStatus.high_priority_component_count, AssetStatus.anomalous_component_count)
            .filter(AssetStatus.asset_id.in_(asset_ids))
            .order_by(AssetStatus.asset_id, AssetStatus.calculated_at.desc())
            .all()
        )
        for r in st_rows:
            if r[0] not in status_map:
                status_map[r[0]] = {
                    "status": r[1],
                    "critical_count": r[2],
                    "high_priority_count": r[3],
                    "anomalous_count": r[4]
                }

    items = []
    for a in assets:
        st_info = status_map.get(a.asset_id, {"status": "READY", "critical_count": 0, "high_priority_count": 0, "anomalous_count": 0})
        if status_filter and st_info["status"].upper() != status_filter.upper():
            continue

        items.append({
            "id": a.id,
            "asset_id": a.asset_id,
            "asset_name": a.asset_name,
            "asset_type": a.asset_type,
            "status": st_info["status"],
            "critical_component_count": st_info["critical_count"],
            "high_priority_component_count": st_info["high_priority_count"],
            "anomalous_component_count": st_info["anomalous_count"],
            "created_at": a.created_at,
        })

    return {
        "total": total,
        "count": len(items),
        "items": items
    }

@router.get(
    "/{asset_id}",
    summary="Get single asset condition with 4 components",
    description="Retrieve comprehensive condition of an asset and all its individual components."
)
def get_asset(
    asset_id: str,
    db: Session = Depends(get_db)
):
    asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset '{asset_id}' not found."
        )

    # Get latest status
    latest_status = (
        db.query(AssetStatus)
        .filter(AssetStatus.asset_id == asset_id)
        .order_by(AssetStatus.calculated_at.desc())
        .first()
    )

    # Get all components of this asset
    components = db.query(Component).filter(Component.asset_id == asset_id).all()

    # For each component, get the latest prediction
    comp_data = []
    for c in components:
        latest_pred = (
            db.query(Prediction)
            .filter(Prediction.component_id == c.component_id)
            .order_by(Prediction.timestamp.desc())
            .first()
        )
        comp_data.append({
            "component_id": c.component_id,
            "component_type": c.component_type,
            "timestamp": latest_pred.timestamp if latest_pred else None,
            "anomaly_prediction": latest_pred.anomaly_prediction if latest_pred else None,
            "anomaly_probability": latest_pred.anomaly_probability if latest_pred else None,
            "failure_prediction": latest_pred.failure_prediction if latest_pred else None,
            "failure_probability": latest_pred.failure_probability if latest_pred else None,
            "primary_reason": latest_pred.primary_reason if latest_pred else None,
            "secondary_reason": latest_pred.secondary_reason if latest_pred else None,
            "trend_risk": latest_pred.trend_risk if latest_pred else None,
            "anomaly_severity": latest_pred.anomaly_severity if latest_pred else None,
            "health_score": latest_pred.health_score if latest_pred else None,
            "maintenance_priority": latest_pred.maintenance_priority if latest_pred else None,
            "priority_level": latest_pred.priority_level if latest_pred else None,
        })

    return {
        "asset_id": asset.asset_id,
        "asset_name": asset.asset_name,
        "asset_type": asset.asset_type,
        "status": latest_status.status if latest_status else "READY",
        "critical_component_count": latest_status.critical_component_count if latest_status else 0,
        "high_priority_component_count": latest_status.high_priority_component_count if latest_status else 0,
        "anomalous_component_count": latest_status.anomalous_component_count if latest_status else 0,
        "calculated_at": latest_status.calculated_at if latest_status else None,
        "components": comp_data
    }

@router.get(
    "/{asset_id}/components",
    summary="Get all components of an asset",
    description="Retrieve all components belonging to a specific asset with latest status."
)
def get_asset_components(
    asset_id: str,
    db: Session = Depends(get_db)
):
    asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset '{asset_id}' not found."
        )

    components = db.query(Component).filter(Component.asset_id == asset_id).all()
    results = []
    for c in components:
        latest_pred = (
            db.query(Prediction)
            .filter(Prediction.component_id == c.component_id)
            .order_by(Prediction.timestamp.desc())
            .first()
        )
        results.append({
            "component_id": c.component_id,
            "component_type": c.component_type,
            "asset_id": c.asset_id,
            "latest_prediction": {
                "timestamp": latest_pred.timestamp if latest_pred else None,
                "anomaly_prediction": latest_pred.anomaly_prediction if latest_pred else None,
                "anomaly_probability": latest_pred.anomaly_probability if latest_pred else None,
                "failure_prediction": latest_pred.failure_prediction if latest_pred else None,
                "failure_probability": latest_pred.failure_probability if latest_pred else None,
                "primary_reason": latest_pred.primary_reason if latest_pred else None,
                "secondary_reason": latest_pred.secondary_reason if latest_pred else None,
                "health_score": latest_pred.health_score if latest_pred else None,
                "trend_risk": latest_pred.trend_risk if latest_pred else None,
                "maintenance_priority": latest_pred.maintenance_priority if latest_pred else None,
                "priority_level": latest_pred.priority_level if latest_pred else None,
            } if latest_pred else None
        })

    return {
        "asset_id": asset_id,
        "components": results
    }

@router.get(
    "/{asset_id}/predictions",
    summary="Get prediction history for an asset",
    description="Retrieve historical predictions for all components of this asset."
)
def get_asset_predictions(
    asset_id: str,
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset '{asset_id}' not found."
        )

    predictions = (
        db.query(Prediction)
        .filter(Prediction.asset_id == asset_id)
        .order_by(Prediction.timestamp.desc())
        .limit(limit)
        .all()
    )

    return {
        "asset_id": asset_id,
        "total": len(predictions),
        "predictions": [
            {
                "id": p.id,
                "timestamp": p.timestamp,
                "component_id": p.component_id,
                "component_type": p.component_type,
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
            }
            for p in predictions
        ]
    }
