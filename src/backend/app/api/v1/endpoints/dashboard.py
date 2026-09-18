from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.models.asset import Asset
from app.models.component import Component
from app.models.status import AssetStatus
from app.models.prediction import Prediction

router = APIRouter()

@router.get(
    "/summary",
    summary="Dashboard fleet readiness summary",
    description="Retrieve aggregate readiness status counts and health metrics across all assets."
)
def get_dashboard_summary(db: Session = Depends(get_db)):
    total_assets = db.query(Asset).count()
    total_components = db.query(Component).count()

    # Get latest status for each asset
    latest_status_records = (
        db.query(AssetStatus.asset_id, AssetStatus.status, AssetStatus.critical_component_count, AssetStatus.high_priority_component_count, AssetStatus.anomalous_component_count)
        .distinct(AssetStatus.asset_id)
        .order_by(AssetStatus.asset_id, AssetStatus.calculated_at.desc())
        .all()
    )

    ready_count = sum(1 for s in latest_status_records if s[1] == "READY")
    attention_count = sum(1 for s in latest_status_records if s[1] == "ATTENTION")
    not_ready_count = sum(1 for s in latest_status_records if s[1] == "NOT_READY")

    # Critical & high priority count
    critical_comps = sum(s[2] for s in latest_status_records)
    high_priority_comps = sum(s[3] for s in latest_status_records)
    anomalous_comps = sum(s[4] for s in latest_status_records)

    readiness_rate = round((ready_count / total_assets * 100.0), 2) if total_assets > 0 else 100.0

    return {
        "total_assets": total_assets,
        "total_components": total_components,
        "readiness_rate_percent": readiness_rate,
        "status_distribution": {
            "READY": ready_count,
            "ATTENTION": attention_count,
            "NOT_READY": not_ready_count,
        },
        "component_risk_summary": {
            "critical_components": critical_comps,
            "high_priority_components": high_priority_comps,
            "anomalous_components": anomalous_comps,
        }
    }

@router.get(
    "/critical-components",
    summary="Get critical priority components",
    description="Retrieve all components with latest maintenance priority >= 80 (CRITICAL)."
)
def get_critical_components(db: Session = Depends(get_db)):
    # Distinct on component_id ordered by timestamp desc
    query = text("""
        SELECT DISTINCT ON (p.component_id)
            p.component_id,
            p.asset_id,
            p.component_type,
            p.timestamp,
            p.maintenance_priority,
            p.priority_level,
            p.failure_probability,
            p.anomaly_probability,
            p.health_score,
            p.trend_risk,
            p.primary_reason,
            p.secondary_reason
        FROM predictions p
        ORDER BY p.component_id, p.timestamp DESC;
    """)
    rows = db.execute(query).fetchall()

    critical = [
        {
            "component_id": r[0],
            "asset_id": r[1],
            "component_type": r[2],
            "timestamp": r[3],
            "maintenance_priority": r[4],
            "priority_level": r[5],
            "failure_probability": r[6],
            "anomaly_probability": r[7],
            "health_score": r[8],
            "trend_risk": r[9],
            "primary_reason": r[10],
            "secondary_reason": r[11],
        }
        for r in rows
        if r[5] == "CRITICAL" or (r[4] is not None and r[4] >= 80.0)
    ]

    return {
        "count": len(critical),
        "components": critical
    }

@router.get(
    "/high-priority-components",
    summary="Get high priority components",
    description="Retrieve all components with latest maintenance priority between 60 and 79 (HIGH)."
)
def get_high_priority_components(db: Session = Depends(get_db)):
    query = text("""
        SELECT DISTINCT ON (p.component_id)
            p.component_id,
            p.asset_id,
            p.component_type,
            p.timestamp,
            p.maintenance_priority,
            p.priority_level,
            p.failure_probability,
            p.anomaly_probability,
            p.health_score,
            p.trend_risk,
            p.primary_reason,
            p.secondary_reason
        FROM predictions p
        ORDER BY p.component_id, p.timestamp DESC;
    """)
    rows = db.execute(query).fetchall()

    high_pri = [
        {
            "component_id": r[0],
            "asset_id": r[1],
            "component_type": r[2],
            "timestamp": r[3],
            "maintenance_priority": r[4],
            "priority_level": r[5],
            "failure_probability": r[6],
            "anomaly_probability": r[7],
            "health_score": r[8],
            "trend_risk": r[9],
            "primary_reason": r[10],
            "secondary_reason": r[11],
        }
        for r in rows
        if r[5] == "HIGH" or (r[4] is not None and 60.0 <= r[4] < 80.0)
    ]

    return {
        "count": len(high_pri),
        "components": high_pri
    }
