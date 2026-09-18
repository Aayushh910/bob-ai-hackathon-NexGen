from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Component(Base):
    __tablename__ = "components"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    component_id = Column(String(50), unique=True, nullable=False, index=True)
    asset_id = Column(String(50), ForeignKey("assets.asset_id", ondelete="CASCADE"), nullable=False, index=True)
    component_type = Column(String(50), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    asset = relationship("Asset", back_populates="components", primaryjoin="Component.asset_id == Asset.asset_id")
    sensor_readings = relationship(
        "SensorReading",
        back_populates="component",
        cascade="all, delete-orphan",
        primaryjoin="Component.component_id == SensorReading.component_id"
    )
    predictions = relationship(
        "Prediction",
        back_populates="component",
        cascade="all, delete-orphan",
        primaryjoin="Component.component_id == Prediction.component_id"
    )
    trend_records = relationship(
        "TrendAnalysis",
        back_populates="component",
        cascade="all, delete-orphan",
        primaryjoin="Component.component_id == TrendAnalysis.component_id"
    )

    __table_args__ = (
        Index("ix_components_asset_id", "asset_id"),
        Index("ix_components_component_id", "component_id"),
        Index("ix_components_component_type", "component_type"),
    )
