from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

class SensorReadingBase(BaseModel):
    asset_id: int = Field(..., description="ID of associated asset")
    timestamp: datetime = Field(..., description="Timestamp of sensor measurement")

    component_id: Optional[str] = Field(None, max_length=50, description="HUMS Component identifier")
    component_type: Optional[str] = Field(None, max_length=50, description="Component classification")

    temperature: Optional[float] = Field(None, description="Primary temperature in Celsius")
    vibration: Optional[float] = Field(None, description="Vibration mm/s RMS")
    oil_pressure: Optional[float] = Field(None, description="Oil pressure in psi")
    fuel_pressure: Optional[float] = Field(None, description="Fuel pressure in psi")
    rpm: Optional[float] = Field(None, description="Revolutions per minute")
    hydraulic_pressure: Optional[float] = Field(None, description="Hydraulic system pressure")
    battery_voltage: Optional[float] = Field(None, description="Battery voltage")
    coolant_temperature: Optional[float] = Field(None, description="Coolant temperature in Celsius")
    operating_hours: Optional[float] = Field(None, ge=0.0, description="Cumulative operational hours")
    load_percentage: Optional[float] = Field(None, ge=0.0, le=100.0, description="Engine/system load percentage")
    ambient_temperature: Optional[float] = Field(None, description="Ambient temperature in Celsius")

    sensor_status: Optional[str] = Field("Normal", max_length=20, description="Status (Normal, Warning, Critical)")
    anomaly_label: Optional[int] = Field(0, description="Ground truth anomaly label (0: Normal, 1: Anomaly)")
    failure_within_50_hours: Optional[int] = Field(0, description="Ground truth failure flag (0: False, 1: True)")

    # Backward-compatible fields
    engine_temperature: Optional[float] = Field(None, description="Legacy alias for temperature")
    fuel_level: Optional[float] = Field(None, description="Legacy alias for fuel level")

class SensorReadingCreate(SensorReadingBase):
    pass

class SensorReadingBulkCreate(BaseModel):
    readings: List[SensorReadingCreate] = Field(..., description="List of telemetry readings to insert in batch")

class SensorReadingResponse(SensorReadingBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class TelemetryListResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[SensorReadingResponse]

class BulkIngestionResponse(BaseModel):
    inserted: int
    failed: int
    message: str
