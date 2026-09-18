from sqlalchemy import Column, BigInteger, Integer, String, DateTime, ForeignKey, Index, CheckConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class AssetStatus(Base):
    __tablename__ = "asset_status"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    asset_id = Column(String(50), ForeignKey("assets.asset_id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(20), nullable=False, index=True)
    critical_component_count = Column(Integer, nullable=False, default=0)
    high_priority_component_count = Column(Integer, nullable=False, default=0)
    anomalous_component_count = Column(Integer, nullable=False, default=0)
    calculated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    asset = relationship("Asset", back_populates="status_records", primaryjoin="AssetStatus.asset_id == Asset.asset_id")

    __table_args__ = (
        CheckConstraint("status IN ('READY', 'ATTENTION', 'NOT_READY')", name="chk_asset_status_allowed"),
        Index("ix_asset_status_asset_calc_desc", "asset_id", calculated_at.desc()),
    )
