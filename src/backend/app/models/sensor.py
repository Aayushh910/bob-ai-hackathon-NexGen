from sqlalchemy import Column, BigInteger, Float, String, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    asset_id = Column(String(50), ForeignKey("assets.asset_id", ondelete="CASCADE"), nullable=False, index=True)
    component_id = Column(String(50), ForeignKey("components.component_id", ondelete="CASCADE"), nullable=False, index=True)
    component_type = Column(String(50), nullable=False, index=True)

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
    sensor_status = Column(String(50), nullable=True)
    source_file = Column(String(100), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    asset = relationship("Asset", back_populates="sensor_readings", primaryjoin="SensorReading.asset_id == Asset.asset_id")
    component = relationship("Component", back_populates="sensor_readings", primaryjoin="SensorReading.component_id == Component.component_id")

    __table_args__ = (
        Index("ix_sensor_readings_asset_timestamp", "asset_id", "timestamp"),
        Index("ix_sensor_readings_component_timestamp_desc", "component_id", timestamp.desc()),
    )
