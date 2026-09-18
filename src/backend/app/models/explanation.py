from sqlalchemy import Column, BigInteger, Integer, Float, String, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class PredictionExplanation(Base):
    __tablename__ = "prediction_explanations"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    prediction_id = Column(BigInteger, ForeignKey("predictions.id", ondelete="CASCADE"), nullable=False, index=True)
    feature_name = Column(String(100), nullable=False)
    shap_value = Column(Float, nullable=False)
    feature_value = Column(Float, nullable=True)
    contribution_direction = Column(String(20), nullable=True)
    rank = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationship
    prediction = relationship("Prediction", back_populates="explanations")

    __table_args__ = (
        Index("ix_prediction_explanations_pred_rank", "prediction_id", "rank"),
    )
