from typing import Any, Dict, List, Optional, Tuple, Union
from sqlalchemy.orm import Session
from app.services.base import BaseService
from app.repositories.asset import asset_repo
from app.models.asset import Asset
from app.schemas.asset import AssetCreate, AssetUpdate
from app.core.exceptions import ResourceNotFoundException, SentinelAIException

class AssetService(BaseService[Asset, AssetCreate, AssetUpdate]):
    def __init__(self):
        super().__init__(asset_repo)
        self.repo = asset_repo

    def get_asset(self, db: Session, asset_id: int) -> Asset:
        asset = self.repo.get(db, id=asset_id)
        if not asset:
            raise ResourceNotFoundException("Asset", asset_id)
        self._enrich_asset_condition(db, [asset])
        return asset

    def get_asset_by_code(self, db: Session, asset_code: str) -> Optional[Asset]:
        asset = self.repo.get_by_code(db, asset_code=asset_code)
        if asset:
            self._enrich_asset_condition(db, [asset])
        return asset

    def _enrich_asset_condition(self, db: Session, assets: List[Asset]):
        from app.repositories.readiness import readiness_repository
        ass_map = readiness_repository.get_latest_assessment_map(db)
        for a in assets:
            ass = ass_map.get(a.id)
            if a.status == "MAINTENANCE":
                a.condition = "MAINTENANCE"
                a.readiness_state = "MAINTENANCE"
                a.readiness_score = ass.readiness_score if ass else 50.0
                a.sensor_connected = True
            elif ass:
                a.readiness_score = ass.readiness_score
                a.readiness_state = ass.readiness_state
                a.sensor_connected = True
                if ass.readiness_score >= 70.0:
                    a.condition = "OPERATIONAL"
                elif ass.readiness_score >= 40.0:
                    a.condition = "DEGRADED"
                else:
                    a.condition = "CRITICAL"
            else:
                a.readiness_score = None
                a.readiness_state = "OFFLINE"
                a.condition = "OFFLINE"
                a.sensor_connected = False

    def list_assets(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        asset_type: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> Tuple[List[Asset], int]:
        items = self.repo.filter_assets(
            db, skip=skip, limit=limit, asset_type=asset_type, status=status, search=search
        )
        total = self.repo.count_assets(
            db, asset_type=asset_type, status=status, search=search
        )
        self._enrich_asset_condition(db, items)
        return items, total

    def create_asset(self, db: Session, asset_in: AssetCreate) -> Asset:
        existing = self.repo.get_by_code(db, asset_code=asset_in.asset_code)
        if existing:
            raise SentinelAIException(
                message=f"Asset with code '{asset_in.asset_code}' already exists.",
                status_code=409
            )
        return self.repo.create(db, obj_in=asset_in)

    def update_asset(self, db: Session, asset_id: int, asset_in: AssetUpdate) -> Asset:
        asset = self.get_asset(db, asset_id=asset_id)
        if asset_in.asset_code and asset_in.asset_code != asset.asset_code:
            existing = self.repo.get_by_code(db, asset_code=asset_in.asset_code)
            if existing:
                raise SentinelAIException(
                    message=f"Asset with code '{asset_in.asset_code}' already exists.",
                    status_code=409
                )
        return self.repo.update(db, db_obj=asset, obj_in=asset_in)

    def delete_asset(self, db: Session, asset_id: int) -> Asset:
        asset = self.get_asset(db, asset_id=asset_id)
        return self.repo.remove(db, id=asset.id)

asset_service = AssetService()
