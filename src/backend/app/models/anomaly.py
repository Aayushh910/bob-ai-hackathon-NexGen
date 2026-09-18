from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    sensor_reading_id = Column(Integer, ForeignKey("sensor_readings.id", ondelete="SET NULL"), nullable=True, index=True)
    anomaly_score = Column(Float, nullable=False)
    severity = Column(String(50), nullable=False)
    detected_at = Column(DateTime(timezone=True), nullable=False, index=True, server_default=func.now())
    affected_sensor = Column(String(255), nullable=True)
    explanation = Column(Text, nullable=True)

    model_version = Column(String(50), nullable=True, default="1.0.0")

    # Relationships
    asset = relationship("Asset", foreign_keys=[asset_id])
    sensor_reading = relationship("SensorReading", foreign_keys=[sensor_reading_id])
