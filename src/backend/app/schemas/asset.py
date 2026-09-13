from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class AssetBase(BaseModel):
    asset_code: str = Field(..., max_length=50, description="Unique asset identifier code")
    asset_type: str = Field(..., max_length=50, description="Asset classification (e.g. Aircraft, Vehicle, Ground Equipment)")
    model: str = Field(..., max_length=100, description="Model designation")
    manufacturer: Optional[str] = Field(None, max_length=100, description="Manufacturing company")
    year: Optional[int] = Field(None, ge=1900, le=2100, description="Year of manufacture")
    location: str = Field(..., max_length=100, description="Deployment base or physical location")
    status: str = Field("ACTIVE", max_length=50, description="Operational status (ACTIVE, INACTIVE, MAINTENANCE, RETIRED)")

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    asset_code: Optional[str] = Field(None, max_length=50)
    asset_type: Optional[str] = Field(None, max_length=50)
    model: Optional[str] = Field(None, max_length=100)
    manufacturer: Optional[str] = Field(None, max_length=100)
    year: Optional[int] = Field(None, ge=1900, le=2100)
    location: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = Field(None, max_length=50)

class AssetResponse(AssetBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AssetListResponse(BaseModel):
    total: int
    page: int
    size: int
    items: list[AssetResponse]
