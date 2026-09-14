from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    prediction_type = Column(String(50), nullable=False)
    failure_probability = Column(Float, nullable=True)
    predicted_failure = Column(Boolean, nullable=False, default=False)
    prediction_timestamp = Column(DateTime(timezone=True), nullable=False, index=True, server_default=func.now())
    model_version = Column(String(50), nullable=False, default="1.0.0")
    confidence = Column(Float, nullable=True)

    # Extended prediction targets from ML models
    rul_hours = Column(Float, nullable=True)
    predicted_failure_mode = Column(String(100), nullable=True)
    risk_level = Column(String(50), nullable=True)

    # Relationships
    asset = relationship("Asset", back_populates="predictions")
    recommendations = relationship(
        "Recommendation",
        back_populates="prediction",
        cascade="all, delete-orphan"
    )
