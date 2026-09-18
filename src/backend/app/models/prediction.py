from sqlalchemy import Column, BigInteger, Integer, Float, String, Text, DateTime, ForeignKey, Index, CheckConstraint, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    asset_id = Column(String(50), ForeignKey("assets.asset_id", ondelete="CASCADE"), nullable=False, index=True)
    component_id = Column(String(50), ForeignKey("components.component_id", ondelete="CASCADE"), nullable=False, index=True)
    component_type = Column(String(50), nullable=False, index=True)

    anomaly_prediction = Column(Integer, nullable=False, index=True)
    anomaly_probability = Column(Float, nullable=False)
    failure_prediction = Column(Integer, nullable=False, index=True)
    failure_probability = Column(Float, nullable=False)

    primary_reason = Column(Text, nullable=True)
    secondary_reason = Column(Text, nullable=True)

    anomaly_severity = Column(Float, nullable=True)
    trend_risk = Column(Float, nullable=True)
    health_score = Column(Float, nullable=True)
    maintenance_priority = Column(Float, nullable=True)
    priority_level = Column(String(50), nullable=True, index=True)

    model_version = Column(String(50), nullable=True, default="1.0.0")
    source_file = Column(String(100), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    asset = relationship("Asset", back_populates="predictions", primaryjoin="Prediction.asset_id == Asset.asset_id")
    component = relationship("Component", back_populates="predictions", primaryjoin="Prediction.component_id == Component.component_id")
    explanations = relationship(
        "PredictionExplanation",
        back_populates="prediction",
        cascade="all, delete-orphan",
        order_by="PredictionExplanation.rank"
    )

    __table_args__ = (
        UniqueConstraint("asset_id", "component_id", "timestamp", name="uq_predictions_asset_comp_ts"),
        CheckConstraint("anomaly_prediction IN (0, 1)", name="chk_pred_anomaly_prediction"),
        CheckConstraint("anomaly_probability >= 0 AND anomaly_probability <= 100", name="chk_pred_anomaly_prob"),
        CheckConstraint("failure_prediction IN (0, 1)", name="chk_pred_failure_prediction"),
        CheckConstraint("failure_probability >= 0 AND failure_probability <= 100", name="chk_pred_failure_prob"),
        CheckConstraint("anomaly_severity IS NULL OR (anomaly_severity >= 0 AND anomaly_severity <= 100)", name="chk_pred_anomaly_severity"),
        CheckConstraint("trend_risk IS NULL OR (trend_risk >= 0 AND trend_risk <= 100)", name="chk_pred_trend_risk"),
        CheckConstraint("health_score IS NULL OR (health_score >= 0 AND health_score <= 100)", name="chk_pred_health_score"),
        CheckConstraint("maintenance_priority IS NULL OR (maintenance_priority >= 0 AND maintenance_priority <= 100)", name="chk_pred_maint_priority"),
        Index("ix_predictions_asset_comp_ts_desc", "asset_id", "component_id", timestamp.desc()),
    )
