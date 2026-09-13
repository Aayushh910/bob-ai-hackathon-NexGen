from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    asset_code = Column(String(50), unique=True, index=True, nullable=False)
    asset_type = Column(String(50), nullable=False, index=True)
    model = Column(String(100), nullable=False)
    manufacturer = Column(String(100), nullable=True)
    year = Column(Integer, nullable=True)
    location = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False, default="ACTIVE", index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    sensor_readings = relationship(
        "SensorReading",
        back_populates="asset",
        cascade="all, delete-orphan"
    )
    maintenance_records = relationship(
        "MaintenanceRecord",
        back_populates="asset",
        cascade="all, delete-orphan"
    )
    predictions = relationship(
        "Prediction",
        back_populates="asset",
        cascade="all, delete-orphan"
    )
    anomalies = relationship(
        "Anomaly",
        back_populates="asset",
        cascade="all, delete-orphan"
    )
    recommendations = relationship(
        "Recommendation",
        back_populates="asset",
        cascade="all, delete-orphan"
    )
    readiness_assessments = relationship(
        "ReadinessAssessment",
        back_populates="asset",
        cascade="all, delete-orphan"
    )

