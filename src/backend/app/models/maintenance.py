from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    component_id = Column(String(50), nullable=True, index=True)
    component_type = Column(String(100), nullable=True, index=True)
    maintenance_date = Column(DateTime(timezone=True), nullable=False, index=True)
    operating_hours = Column(Float, nullable=True)
    maintenance_type = Column(String(50), nullable=False, index=True)
    component = Column(String(100), nullable=True)
    issue_detected = Column(String(255), nullable=True)
    failure_type = Column(String(100), nullable=True, index=True)
    component_condition = Column(String(50), nullable=True)
    parts_replaced = Column(String(100), nullable=True)
    failure_occurred = Column(Boolean, nullable=False, default=False)
    maintenance_duration_hours = Column(Float, nullable=True)
    next_maintenance_due_hours = Column(Float, nullable=True)
    description = Column(Text, nullable=True)
    technician = Column(String(100), nullable=True)
    cost = Column(Float, nullable=True)
    next_maintenance_date = Column(DateTime(timezone=True), nullable=True)
    maintenance_status = Column(String(50), nullable=False, default="COMPLETED", index=True)

    # Relationships
    asset = relationship("Asset", foreign_keys=[asset_id])

