from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    prediction_id = Column(Integer, ForeignKey("predictions.id", ondelete="SET NULL"), nullable=True, index=True)
    priority = Column(String(50), nullable=False)
    recommendation = Column(Text, nullable=False)
    reason = Column(Text, nullable=True)
    generated_at = Column(DateTime(timezone=True), nullable=False, index=True, server_default=func.now())
    status = Column(String(50), nullable=False, default="PENDING")

    # Relationships
    asset = relationship("Asset", foreign_keys=[asset_id])
    prediction = relationship("Prediction", foreign_keys=[prediction_id])
