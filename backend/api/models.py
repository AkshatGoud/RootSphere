from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Integer, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from .db import Base

def generate_uuid():
    return str(uuid.uuid4())

class Farmer(Base):
    __tablename__ = "farmers"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, index=True)
    phone = Column(String, index=True)
    email = Column(String, unique=True, index=True, nullable=True) # Nullable for migration safety
    password_hash = Column(String, nullable=True)
    language = Column(String, default="en")
    reset_code = Column(String, nullable=True)
    reset_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    fields = relationship("Field", back_populates="farmer")

class Field(Base):
    __tablename__ = "fields"
    id = Column(String, primary_key=True, default=generate_uuid)
    farmer_id = Column(String, ForeignKey("farmers.id"))
    name = Column(String)
    crop = Column(String)
    growth_stage = Column(String)
    lat = Column(Float)
    lon = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

    farmer = relationship("Farmer", back_populates="fields")
    sensor_readings = relationship("SensorReading", back_populates="field")
    weather_readings = relationship("WeatherReading", back_populates="field")
    images = relationship("Image", back_populates="field")
    recommendations = relationship("Recommendation", back_populates="field")

class SensorReading(Base):
    __tablename__ = "sensor_readings"
    id = Column(String, primary_key=True, default=generate_uuid)
    field_id = Column(String, ForeignKey("fields.id"), index=True)
    sensor_id = Column(String, ForeignKey("sensors.id"), index=True, nullable=True)
    ts = Column(DateTime, index=True)
    moisture = Column(Float)
    ph = Column(Float)
    n = Column(Float)
    p = Column(Float)
    k = Column(Float)

    field = relationship("Field", back_populates="sensor_readings")
    sensor = relationship("Sensor")

class WeatherReading(Base):
    __tablename__ = "weather_readings"
    id = Column(String, primary_key=True, default=generate_uuid)
    field_id = Column(String, ForeignKey("fields.id"), index=True)
    ts = Column(DateTime, index=True)
    temp_c = Column(Float)
    humidity_pct = Column(Float)
    rainfall_mm = Column(Float)

    field = relationship("Field", back_populates="weather_readings")

class Image(Base):
    __tablename__ = "images"
    id = Column(String, primary_key=True, default=generate_uuid)
    field_id = Column(String, ForeignKey("fields.id"), index=True)
    ts = Column(DateTime, index=True)
    source = Column(String)  # phone, drone
    rgb_url = Column(String)
    notes = Column(String, nullable=True)

    field = relationship("Field", back_populates="images")

class Recommendation(Base):
    __tablename__ = "recommendations"
    id = Column(String, primary_key=True, default=generate_uuid)
    field_id = Column(String, ForeignKey("fields.id"), index=True)
    ts = Column(DateTime, index=True)
    action_json = Column(JSON)
    confidence = Column(Float)
    why_json = Column(JSON)

    field = relationship("Field", back_populates="recommendations")
    feedback = relationship("Feedback", back_populates="recommendation", uselist=False)

class Feedback(Base):
    __tablename__ = "feedback"
    id = Column(String, primary_key=True, default=generate_uuid)
    field_id = Column(String, ForeignKey("fields.id"), index=True)
    recommendation_id = Column(String, ForeignKey("recommendations.id"), index=True)
    ts = Column(DateTime, default=datetime.utcnow)
    followed = Column(Boolean)
    outcome = Column(String)
    notes = Column(String, nullable=True)

    recommendation = relationship("Recommendation", back_populates="feedback")
    field = relationship("Field")

class Sensor(Base):
    __tablename__ = "sensors"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, index=True)
    type = Column(String) # Soil, Weather, Other
    metrics = Column(String) # JSON or Comma-separated list of metrics
    status = Column(String, default="draft") # draft, active, inactive
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    assignments = relationship("SensorAssignment", back_populates="sensor")

class SensorAssignment(Base):
    __tablename__ = "sensor_assignments"
    id = Column(String, primary_key=True, default=generate_uuid)
    sensor_id = Column(String, ForeignKey("sensors.id"), index=True)
    field_id = Column(String, ForeignKey("fields.id"), index=True)
    active = Column(Boolean, default=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    notes = Column(String, nullable=True)

    sensor = relationship("Sensor", back_populates="assignments")
    field = relationship("Field")

