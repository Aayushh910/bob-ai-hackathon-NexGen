from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class ReadinessAssessment(Base):
    __tablename__ = "readiness_assessments"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    readiness_state = Column(String(50), nullable=False, index=True)  # READY, CAUTION, DEGRADED, NOT_READY
    readiness_score = Column(Float, nullable=False)  # 0.0 to 100.0
    risk_level = Column(String(50), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    failure_probability = Column(Float, nullable=True)
    rul_hours = Column(Float, nullable=True)
    predicted_failure_mode = Column(String(100), nullable=True)
    is_anomaly = Column(Boolean, nullable=False, default=False)
    primary_reason = Column(Text, nullable=False)
    contributing_factors = Column(JSON, nullable=True)
    risk_factors = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)

    # Relationships
    asset = relationship("Asset", back_populates="readiness_assessments")
