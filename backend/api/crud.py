from sqlalchemy.orm import Session
from sqlalchemy import desc
from . import models, schemas
from datetime import datetime, timedelta

# --- Ingestion ---

def create_sensor_reading(db: Session, reading: schemas.SensorReadingCreate):
    db_reading = models.SensorReading(**reading.model_dump())
    db.add(db_reading)
    db.commit()
    db.refresh(db_reading)
    return db_reading

def create_weather_reading(db: Session, reading: schemas.WeatherReadingCreate):
    db_reading = models.WeatherReading(**reading.model_dump())
    db.add(db_reading)
    db.commit()
    db.refresh(db_reading)
    return db_reading

def create_image(db: Session, image: schemas.ImageCreate):
    db_image = models.Image(**image.model_dump())
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image

def create_recommendation(db: Session, rec_data: dict):
    db_rec = models.Recommendation(**rec_data)
    db.add(db_rec)
    db.commit()
    db.refresh(db_rec)
    return db_rec

from .services import auth

def create_farmer(db: Session, farmer: schemas.FarmerCreate):
    hashed_pwd = auth.get_password_hash(farmer.password)
    db_farmer = models.Farmer(
        name=farmer.name,
        phone=farmer.phone,
        email=farmer.email,
        password_hash=hashed_pwd,
        language=farmer.language
    )
    db.add(db_farmer)
    db.commit()
    db.refresh(db_farmer)
    return db_farmer

def get_farmer_by_email(db: Session, email: str):
    return db.query(models.Farmer).filter(models.Farmer.email == email).first()

def get_farmer(db: Session, farmer_id: str):
    return db.query(models.Farmer).filter(models.Farmer.id == farmer_id).first()

def create_field(db: Session, field: schemas.FieldCreate):
    db_field = models.Field(**field.model_dump())
    db.add(db_field)
    db.commit()
    db.refresh(db_field)
    return db_field

def get_field(db: Session, field_id: str):
    return db.query(models.Field).filter(models.Field.id == field_id).first()

def get_fields_by_farmer(db: Session, farmer_id: str):
    return db.query(models.Field).filter(models.Field.farmer_id == farmer_id).all()

def update_field(db: Session, field_id: str, field_update: schemas.FieldUpdate):
    db_field = get_field(db, field_id)
    if not db_field:
        return None
    
    update_data = field_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_field, key, value)
    
    db.commit()
    db.refresh(db_field)
    return db_field

def create_feedback(db: Session, feedback: schemas.FeedbackCreate):
    db_feedback = models.Feedback(**feedback.model_dump())
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)
    return db_feedback

# --- Browsing ---

def get_recommendations(db: Session, field_id: str, limit: int = 50):
    return db.query(models.Recommendation)\
             .filter(models.Recommendation.field_id == field_id)\
             .order_by(desc(models.Recommendation.ts))\
             .limit(limit)\
             .all()

def get_sensor_readings(db: Session, field_id: str, start: datetime, end: datetime, limit: int = 500):
    return db.query(models.SensorReading)\
             .filter(models.SensorReading.field_id == field_id)\
             .filter(models.SensorReading.ts >= start)\
             .filter(models.SensorReading.ts <= end)\
             .order_by(desc(models.SensorReading.ts))\
             .limit(limit)\
             .all()

def get_weather_readings(db: Session, field_id: str, start: datetime, end: datetime, limit: int = 500):
    return db.query(models.WeatherReading)\
             .filter(models.WeatherReading.field_id == field_id)\
             .filter(models.WeatherReading.ts >= start)\
             .filter(models.WeatherReading.ts <= end)\
             .order_by(desc(models.WeatherReading.ts))\
             .limit(limit)\
             .all()

# --- Retrieval for Snapshot ---

def get_latest_sensor_reading(db: Session, field_id: str):
    return db.query(models.SensorReading)\
             .filter(models.SensorReading.field_id == field_id)\
             .order_by(desc(models.SensorReading.ts))\
             .first()

def get_latest_weather_reading(db: Session, field_id: str):
    # Only consider past/current weather, not forecast
    now = datetime.utcnow()
    return db.query(models.WeatherReading)\
             .filter(models.WeatherReading.field_id == field_id)\
             .filter(models.WeatherReading.ts <= now)\
             .order_by(desc(models.WeatherReading.ts))\
             .first()

def get_rainfall_24h(db: Session, field_id: str):
    now = datetime.utcnow()
    past_24h = now - timedelta(hours=24)
    readings = db.query(models.WeatherReading)\
                 .filter(models.WeatherReading.field_id == field_id)\
                 .filter(models.WeatherReading.ts >= past_24h)\
                 .filter(models.WeatherReading.ts <= now)\
                 .all()
    return sum(r.rainfall_mm for r in readings)

def get_forecast_72h(db: Session, field_id: str):
    now = datetime.utcnow()
    future_72h = now + timedelta(hours=72)
    return db.query(models.WeatherReading)\
             .filter(models.WeatherReading.field_id == field_id)\
             .filter(models.WeatherReading.ts > now)\
             .filter(models.WeatherReading.ts <= future_72h)\
             .order_by(models.WeatherReading.ts.asc())\
             .all()

def get_latest_images(db: Session, field_id: str, limit: int = 3):
    return db.query(models.Image)\
             .filter(models.Image.field_id == field_id)\
             .order_by(desc(models.Image.ts))\
             .limit(limit)\
             .all()

def get_field(db: Session, field_id: str):
    return db.query(models.Field).filter(models.Field.id == field_id).first()

# --- Helper to create farmer/field if needed (for simulator) ---
def ensure_farmer_field(db: Session, farmer_id: str, field_id: str):
    farmer = db.query(models.Farmer).filter(models.Farmer.id == farmer_id).first()
    if not farmer:
        farmer = models.Farmer(id=farmer_id, name="Simulated Farmer", phone="1234567890")
        db.add(farmer)
    
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field:
        field = models.Field(
            id=field_id, farmer_id=farmer_id, name="Sim Field", 
            crop="wheat", growth_stage="vegetative", lat=20.0, lon=78.0
        )
        db.add(field)
    
    db.commit()
    return field

# --- Sensor Management ---

def create_sensor(db: Session, sensor: schemas.SensorCreate):
    db_sensor = models.Sensor(**sensor.model_dump())
    db.add(db_sensor)
    db.commit()
    db.refresh(db_sensor)
    return db_sensor

def get_sensors(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Sensor).offset(skip).limit(limit).all()

def get_sensor(db: Session, sensor_id: str):
    return db.query(models.Sensor).filter(models.Sensor.id == sensor_id).first()

def get_active_assignment(db: Session, sensor_id: str):
    return db.query(models.SensorAssignment)\
             .filter(models.SensorAssignment.sensor_id == sensor_id)\
             .filter(models.SensorAssignment.active == True)\
             .first()

def assign_sensor(db: Session, assignment: schemas.AssignmentCreate):
    # Deactivate current active assignment if any
    current = get_active_assignment(db, assignment.sensor_id)
    if current:
        current.active = False
        current.ended_at = datetime.utcnow()
        db.add(current)
    
    # Create new assignment
    new_assignment = models.SensorAssignment(
        sensor_id=assignment.sensor_id,
        field_id=assignment.field_id,
        notes=assignment.notes,
        active=True,
        started_at=datetime.utcnow()
    )
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    return new_assignment
