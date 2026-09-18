from sqlalchemy import Column, BigInteger, Float, String, DateTime, ForeignKey, Index, CheckConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class TrendAnalysis(Base):
    __tablename__ = "trend_analysis"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    asset_id = Column(String(50), ForeignKey("assets.asset_id", ondelete="CASCADE"), nullable=False, index=True)
    component_id = Column(String(50), ForeignKey("components.component_id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)

    trend_risk = Column(Float, nullable=False)
    rate_of_change = Column(Float, nullable=True)
    persistence_score = Column(Float, nullable=True)
    degradation_score = Column(Float, nullable=True)
    multi_sensor_score = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    asset = relationship("Asset", back_populates="trend_records", primaryjoin="TrendAnalysis.asset_id == Asset.asset_id")
    component = relationship("Component", back_populates="trend_records", primaryjoin="TrendAnalysis.component_id == Component.component_id")

    __table_args__ = (
        CheckConstraint("trend_risk >= 0 AND trend_risk <= 100", name="chk_trend_risk_range"),
        Index("ix_trend_analysis_comp_ts_desc", "component_id", timestamp.desc()),
    )
