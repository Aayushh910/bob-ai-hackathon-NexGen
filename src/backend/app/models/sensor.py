from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.database import Base

class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)

    # Component attribution from HUMS telemetry
    component_id = Column(String(50), nullable=True, index=True)
    component_type = Column(String(50), nullable=True, index=True)

    # Sensor telemetry fields
    temperature = Column(Float, nullable=True)
    vibration = Column(Float, nullable=True)
    oil_pressure = Column(Float, nullable=True)
    fuel_pressure = Column(Float, nullable=True)
    rpm = Column(Float, nullable=True)
    hydraulic_pressure = Column(Float, nullable=True)
    battery_voltage = Column(Float, nullable=True)
    coolant_temperature = Column(Float, nullable=True)
    operating_hours = Column(Float, nullable=True)
    load_percentage = Column(Float, nullable=True)
    ambient_temperature = Column(Float, nullable=True)

    # Operational status & ground-truth flags
    sensor_status = Column(String(20), nullable=True, default="Normal")
    anomaly_label = Column(Integer, nullable=True, default=0)
    failure_within_50_hours = Column(Integer, nullable=True, default=0)

    # Backward-compatible fields
    engine_temperature = Column(Float, nullable=True)
    fuel_level = Column(Float, nullable=True)

    # Relationships
    asset = relationship("Asset", back_populates="sensor_readings")
    anomalies = relationship(
        "Anomaly",
        back_populates="sensor_reading",
        cascade="all, delete-orphan"
    )

    # Indexes
    __table_args__ = (
        Index("ix_sensor_readings_asset_timestamp", "asset_id", "timestamp"),
    )
