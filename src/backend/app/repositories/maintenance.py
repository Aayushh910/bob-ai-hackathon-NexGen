from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from app.models.maintenance import MaintenanceRecord
from app.models.asset import Asset

class MaintenanceRepository:
    def get_by_id(self, db: Session, record_id: int) -> Optional[MaintenanceRecord]:
        return db.query(MaintenanceRecord).filter(MaintenanceRecord.id == record_id).first()

    def list_records(
        self,
        db: Session,
        asset_id: Optional[int] = None,
        component_type: Optional[str] = None,
        component: Optional[str] = None,
        maintenance_type: Optional[str] = None,
        failure_type: Optional[str] = None,
        failure_occurred: Optional[bool] = None,
        status: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[MaintenanceRecord], int]:
        query = db.query(MaintenanceRecord)

        if asset_id is not None:
            query = query.filter(MaintenanceRecord.asset_id == asset_id)
        target_comp = component_type or component
        if target_comp:
            query = query.filter(MaintenanceRecord.component_type.ilike(f"%{target_comp}%"))
        if maintenance_type:
            query = query.filter(MaintenanceRecord.maintenance_type.ilike(f"%{maintenance_type}%"))
        if failure_type:
            query = query.filter(MaintenanceRecord.failure_type.ilike(f"%{failure_type}%"))
        if failure_occurred is not None:
            query = query.filter(MaintenanceRecord.failure_occurred == failure_occurred)
        if status:
            query = query.filter(MaintenanceRecord.maintenance_status == status.upper())
        if date_from:
            query = query.filter(MaintenanceRecord.maintenance_date >= date_from)
        if date_to:
            query = query.filter(MaintenanceRecord.maintenance_date <= date_to)

        total = query.count()
        items = query.order_by(desc(MaintenanceRecord.maintenance_date)).offset(skip).limit(limit).all()
        return items, total

    def get_history_by_asset(
        self, db: Session, asset_id: int, limit: int = 50
    ) -> List[MaintenanceRecord]:
        return (
            db.query(MaintenanceRecord)
            .filter(MaintenanceRecord.asset_id == asset_id)
            .order_by(desc(MaintenanceRecord.maintenance_date))
            .limit(limit)
            .all()
        )

    def get_latest_record_for_asset(
        self, db: Session, asset_id: int
    ) -> Optional[MaintenanceRecord]:
        return (
            db.query(MaintenanceRecord)
            .filter(MaintenanceRecord.asset_id == asset_id)
            .order_by(desc(MaintenanceRecord.maintenance_date))
            .first()
        )

    def get_component_stats_for_asset(
        self, db: Session, asset_id: int
    ) -> Dict[str, Dict[str, Any]]:
        """
        Computes service counts, failure occurrences, and latest condition per component for an asset.
        """
        records = self.get_history_by_asset(db, asset_id, limit=200)
        stats: Dict[str, Dict[str, Any]] = {}

        for r in records:
            comp = r.component_type or "General"
            if comp not in stats:
                stats[comp] = {
                    "component_id": r.component_id,
                    "serviced_count": 0,
                    "failure_count": 0,
                    "latest_condition": r.component_condition or "Good",
                    "latest_parts_replaced": r.parts_replaced if r.parts_replaced != "None" else None,
                    "latest_maintenance_date": r.maintenance_date,
                    "next_due_hours": r.next_maintenance_due_hours
                }
            stats[comp]["serviced_count"] += 1
            if r.failure_occurred:
                stats[comp]["failure_count"] += 1

        return stats

    def get_fleet_summary_metrics(self, db: Session) -> Dict[str, Any]:
        total_records = db.query(MaintenanceRecord).count()

        # Most frequently serviced component
        top_comp = (
            db.query(MaintenanceRecord.component_type, func.count(MaintenanceRecord.id))
            .group_by(MaintenanceRecord.component_type)
            .order_by(desc(func.count(MaintenanceRecord.id)))
            .first()
        )
        most_serviced = top_comp[0] if top_comp else None

        return {
            "total_records": total_records,
            "most_serviced_component": most_serviced
        }

    def update_status(
        self, db: Session, record_id: int, new_status: str
    ) -> Optional[MaintenanceRecord]:
        rec = self.get_by_id(db, record_id)
        if rec:
            rec.maintenance_status = new_status
            db.commit()
            db.refresh(rec)
        return rec

    def create(self, db: Session, record: MaintenanceRecord) -> MaintenanceRecord:
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

maintenance_repository = MaintenanceRepository()
