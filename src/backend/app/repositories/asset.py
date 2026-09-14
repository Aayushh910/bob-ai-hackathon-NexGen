from typing import Any, Dict, List, Optional, Union
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.repositories.base import BaseRepository
from app.models.asset import Asset
from app.schemas.asset import AssetCreate, AssetUpdate

class AssetRepository(BaseRepository[Asset, AssetCreate, AssetUpdate]):
    def __init__(self):
        super().__init__(Asset)

    def get_by_code(self, db: Session, asset_code: str) -> Optional[Asset]:
        return db.query(Asset).filter(Asset.asset_code == asset_code).first()

    def filter_assets(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        asset_type: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Asset]:
        query = db.query(Asset)

        if asset_type:
            query = query.filter(Asset.asset_type.ilike(f"%{asset_type}%"))
        if status:
            query = query.filter(Asset.status == status.upper())
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Asset.asset_code.ilike(search_pattern),
                    Asset.model.ilike(search_pattern),
                    Asset.location.ilike(search_pattern),
                    Asset.manufacturer.ilike(search_pattern)
                )
            )

        return query.order_by(Asset.asset_code.asc()).offset(skip).limit(limit).all()

    def count_assets(
        self,
        db: Session,
        asset_type: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> int:
        query = db.query(Asset)

        if asset_type:
            query = query.filter(Asset.asset_type.ilike(f"%{asset_type}%"))
        if status:
            query = query.filter(Asset.status == status.upper())
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Asset.asset_code.ilike(search_pattern),
                    Asset.model.ilike(search_pattern),
                    Asset.location.ilike(search_pattern),
                    Asset.manufacturer.ilike(search_pattern)
                )
            )

        return query.count()

    def update(
        self,
        db: Session,
        db_obj: Asset,
        obj_in: Union[AssetUpdate, Dict[str, Any]]
    ) -> Asset:
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if hasattr(db_obj, field) and value is not None:
                setattr(db_obj, field, value)

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

asset_repo = AssetRepository()
