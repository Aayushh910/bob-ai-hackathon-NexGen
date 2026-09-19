from sqlalchemy import Column, BigInteger, String, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship, synonym
from app.core.database import Base

class Asset(Base):
    __tablename__ = "assets"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    asset_id = Column(String(50), unique=True, nullable=False, index=True)
    asset_code = synonym("asset_id")
    asset_name = Column(String(100), nullable=True)
    asset_type = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    components = relationship(
        "Component",
        back_populates="asset",
        cascade="all, delete-orphan",
        primaryjoin="Asset.asset_id == Component.asset_id"
    )
    sensor_readings = relationship(
        "SensorReading",
        back_populates="asset",
        cascade="all, delete-orphan",
        primaryjoin="Asset.asset_id == SensorReading.asset_id"
    )
    predictions = relationship(
        "Prediction",
        back_populates="asset",
        cascade="all, delete-orphan",
        primaryjoin="Asset.asset_id == Prediction.asset_id"
    )
    trend_records = relationship(
        "TrendAnalysis",
        back_populates="asset",
        cascade="all, delete-orphan",
        primaryjoin="Asset.asset_id == TrendAnalysis.asset_id"
    )
    status_records = relationship(
        "AssetStatus",
        back_populates="asset",
        cascade="all, delete-orphan",
        primaryjoin="Asset.asset_id == AssetStatus.asset_id"
    )
