from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional, Dict, Literal

# --- Base Schemas ---

class FarmerBase(BaseModel):
    name: str
    phone: str
    language: str = "en"

class FarmerCreate(BaseModel):
    name: str
    phone: str
    email: str # Now required
    password: str # Now required
    language: Optional[str] = "en"

class LoginRequest(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    farmer_id: str
    farmer_name: str

class FarmerResponse(FarmerBase):
    id: str
    created_at: datetime
    class Config:
        from_attributes = True

class FieldBase(BaseModel):
    farmer_id: str
    name: str
    crop: str
    growth_stage: str
    lat: float
    lon: float

class FieldCreate(FieldBase):
    pass

class FieldResponse(FieldBase):
    id: str
    created_at: datetime
    class Config:
        from_attributes = True

class FieldUpdate(BaseModel):
    name: Optional[str] = None
    crop: Optional[str] = None
    growth_stage: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None

class SensorReadingCreate(BaseModel):
    field_id: str
    sensor_id: Optional[str] = None
    ts: datetime
    moisture: float
    ph: float
    n: float
    p: float
    k: float

class WeatherReadingCreate(BaseModel):
    field_id: str
    ts: datetime
    temp_c: float
    humidity_pct: float
    rainfall_mm: float

class ImageCreate(BaseModel):
    field_id: str
    ts: datetime
    source: Literal["phone", "drone"]
    rgb_url: str
    notes: Optional[str] = None

class ImageResponse(ImageCreate):
    id: str
    class Config:
        from_attributes = True

# --- Snapshot Schemas ---

class Location(BaseModel):
    lat: float
    lon: float

class WeatherPoint(BaseModel):
    ts: datetime
    temp_c: float
    humidity_pct: float
    rainfall_mm: float

class WeatherSummary(BaseModel):
    ts: datetime
    temp_c: float
    humidity_pct: float
    rainfall_mm_24h: float
    forecast_72h: List[WeatherPoint]

class ImageSummary(BaseModel):
    id: str
    ts: datetime
    source: str
    rgb_url: str
    notes: Optional[str] = None
    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}

class SensorSummary(BaseModel):
    ts: datetime
    moisture: float
    ph: float
    n: float
    p: float
    k: float
    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}
        
class WeatherReadingResponse(WeatherReadingCreate):
    id: str
    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}

class FieldSnapshotV1(BaseModel):
    field_id: str
    farmer_id: str
    crop: str
    growth_stage: str
    location: Location
    snapshot_ts: datetime
    sensor_readings: Optional[SensorSummary] = None
    weather: Optional[WeatherSummary] = None
    images: List[ImageSummary] = []
    missing_data: List[str] = []

# --- Recommendation Schemas ---

class IrrigationAction(BaseModel):
    action: str
    liters_per_acre: float
    timing: str

class FertilizerAction(BaseModel):
    action: str
    n_kg_acre: float
    p_kg_acre: float
    k_kg_acre: float
    timing: str

class RecommendationResponse(BaseModel):
    id: Optional[str] = None # Added for feedback reference, optional for backward compat if generated purely logic-side? No, usually DB based.
    field_id: str
    ts: datetime
    irrigation: IrrigationAction
    fertilizer: FertilizerAction
    data_completeness: float = Field(ge=0.0, le=1.0, description="Data availability score (0-1): how much data was available for the recommendation")
    why: List[str]
    ai_analysis: Optional[str] = None # Added for ML insights
    ai_forecast: Optional[List[float]] = None # Added for LSTM Forecast Graph [day1, day2, day3]
    ai_history: Optional[List[float]] = None # Added for historical rainfall (last 7 days)
    risk_alert: Optional[str] = None # Added for Hybrid Logic (API vs AI conflict)
    snapshot_used: FieldSnapshotV1
    
    class Config:
        from_attributes = True # Allow ORM mapping

class FeedbackCreate(BaseModel):
    field_id: str
    recommendation_id: str
    followed: bool
    outcome: str
    notes: Optional[str] = None

class FeedbackResponse(FeedbackCreate):
    id: str
    ts: datetime
    class Config:
        from_attributes = True 

class RecommendationHistoryItem(BaseModel):
    id: str
    field_id: str
    ts: datetime
    action_json: dict
    data_completeness: float
    why_json: List[str]
    # Snapshot omitted/optional
    class Config:
        from_attributes = True

    class Config:
        from_attributes = True

# --- Sensor Schemas ---

class SensorBase(BaseModel):
    name: str # e.g. "Soil Probe A1"
    type: str # e.g. "Soil", "Weather"
    metrics: str # Comma separated e.g. "n,p,k,ph"
    status: str = "draft" # draft, active, inactive
    notes: Optional[str] = None

class SensorCreate(SensorBase):
    pass

class SensorResponse(SensorBase):
    id: str
    created_at: datetime
    current_assignment: Optional["SensorAssignmentResponse"] = None
    
    class Config:
        from_attributes = True

class SensorAssignmentBase(BaseModel):
    sensor_id: str
    field_id: str
    active: bool = True
    start_date: datetime = Field(default_factory=datetime.utcnow) # Frontend sends this
    notes: Optional[str] = None

class AssignmentCreate(BaseModel):
    sensor_id: str
    field_id: str
    notes: Optional[str] = None

class SensorAssignmentResponse(SensorAssignmentBase):
    id: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    field_name: Optional[str] = None # Enriched

    class Config:
        from_attributes = True

# Update circular references
SensorResponse.model_rebuild()
