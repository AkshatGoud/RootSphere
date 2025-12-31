from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from datetime import datetime, timedelta
from .services.weather_ml import weather_ml_service

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import time
import uuid
import json
import logging

from . import crud, models, schemas, recommendation
from .services import weather as weather_service
from .services import auth as auth_service
from .db import engine, get_db

# Logging Config
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")

app = FastAPI(title="RootSphere AI API")

# Create database tables on startup
models.Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def observability_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    
    response.headers["X-Request-Id"] = request_id
    
    log_data = {
        "request_id": request_id,
        "method": request.method,
        "path": request.url.path,
        "status_code": response.status_code,
        "latency_ms": round(process_time, 2)
    }
    
    # Try to extract field_id from path params if simple
    # Regex might be safer, but let's just check simple path
    # e.g., /field/{field_id}/latest
    path_parts = request.url.path.split('/')
    if "field" in path_parts and len(path_parts) > path_parts.index("field") + 1:
        # crude guess, improved if we used Starlette routing args but middleware runs before
        pass
    
    logger.info(json.dumps(log_data))
    
    return response

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/ready")
def readiness_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        raise HTTPException(status_code=503, detail="Database not ready")

@app.post("/farmers", response_model=schemas.FarmerResponse)
def create_farmer(farmer: schemas.FarmerCreate, db: Session = Depends(get_db)):
    # Check if email already exists
    if crud.get_farmer_by_email(db, farmer.email):
        raise HTTPException(status_code=400, detail="Email already registered")
        
    return crud.create_farmer(db, farmer)

@app.post("/login", response_model=schemas.Token)
def login(form_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    farmer = crud.get_farmer_by_email(db, form_data.email)
    if not farmer:
        raise HTTPException(status_code=404, detail="No account found with this email")
    if not auth_service.verify_password(form_data.password, farmer.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect password")
    
    access_token = auth_service.create_access_token(data={"sub": farmer.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "farmer_id": farmer.id,
        "farmer_name": farmer.name
    }

@app.post("/auth/forgot-password")
def forgot_password(req: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    farmer = crud.get_farmer_by_email(db, req.email)
    if not farmer:
        raise HTTPException(status_code=404, detail="No account found with this email")
    
    # Generate 6 digit code
    import random
    code = f"{random.randint(100000, 999999)}"
    
    # Save to DB
    farmer.reset_code = code
    farmer.reset_expires = datetime.utcnow() + timedelta(minutes=15)
    db.commit()
    
    # Log to console (Simulate Email)
    print(f"\n[EMAIL SIMULATION] Password Reset Code for {req.email}: {code}\n", flush=True)
    logger.info(f"Password reset code for {req.email}: {code}")
    
    return {"message": "Reset code sent to email (check server logs/console)."}

@app.post("/auth/reset-password")
def reset_password(req: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    farmer = crud.get_farmer_by_email(db, req.email)
    if not farmer:
        raise HTTPException(status_code=400, detail="Invalid request")
        
    if not farmer.reset_code or farmer.reset_code != req.code:
        raise HTTPException(status_code=400, detail="Invalid code")
        
    if farmer.reset_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Code expired")
        
    # Reset Password
    hashed_pwd = auth_service.get_password_hash(req.new_password)
    farmer.password_hash = hashed_pwd
    farmer.reset_code = None
    farmer.reset_expires = None
    db.commit()
    
    return {"message": "Password updated successfully"}

@app.get("/farmers/{farmer_id}", response_model=schemas.FarmerResponse)
def read_farmer(farmer_id: str, db: Session = Depends(get_db)):
    db_farmer = crud.get_farmer(db, farmer_id)
    if db_farmer is None:
        raise HTTPException(status_code=404, detail="Farmer not found")
    return db_farmer

@app.post("/fields", response_model=schemas.FieldResponse)
def create_field(field: schemas.FieldCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Check if farmer exists
    if not crud.get_farmer(db, field.farmer_id):
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    db_field = crud.create_field(db, field)
    
    # Trigger background weather fetch (sync for now for simplicity)
    try:
        current, forecast = weather_service.fetch_live_weather(db_field.lat, db_field.lon, db_field.id)
        if current:
            crud.create_weather_reading(db, current)
        for f in forecast:
            crud.create_weather_reading(db, f) # Logic in crud might separate forecast? 
            # Wait, `create_weather_reading` just adds a reading. 
            # Do we distinguish forecast? The simulator used the same endpoint.
            # Ideally forecast should be stored differently or with future timestamps.
            # Our `FieldSnapshot` splits them based on TS comparison.
            # Crud.get_weather_readings gets historical? 
            # get_forecast_72h gets future.
            # So saving them as readings is correct if TS > now.
            pass
            
    except Exception as e:
        logger.error(f"Weather fetch error: {e}")
        # Non-blocking, continue
        
    # Trigger Dynamic ML Training
    background_tasks.add_task(weather_ml_service.train_model_for_field, db_field.id, db_field.lat, db_field.lon)
        
    return db_field

@app.get("/fields/{field_id}", response_model=schemas.FieldResponse)
def read_field(field_id: str, db: Session = Depends(get_db)):
    db_field = crud.get_field(db, field_id)
    if db_field is None:
        raise HTTPException(status_code=404, detail="Field not found")
    return db_field

@app.put("/fields/{field_id}", response_model=schemas.FieldResponse)
def update_field(field_id: str, field_update: schemas.FieldUpdate, db: Session = Depends(get_db)):
    db_field = crud.update_field(db, field_id, field_update)
    if not db_field:
        raise HTTPException(status_code=404, detail="Field not found")
    
    # If location changed, refresh weather
    if field_update.lat is not None or field_update.lon is not None:
        try:
            current, forecast = weather_service.fetch_live_weather(db_field.lat, db_field.lon, db_field.id)
            if current:
                crud.create_weather_reading(db, current)
            for f in forecast:
                crud.create_weather_reading(db, f)
        except Exception as e:
            logger.error(f"Weather fetch error during update: {e}")

    return db_field

@app.get("/fields", response_model=List[schemas.FieldResponse])
def list_fields(farmer_id: str, db: Session = Depends(get_db)):
    return crud.get_fields_by_farmer(db, farmer_id)

@app.post("/ingest/sensor", response_model=schemas.SensorReadingCreate)
def ingest_sensor(reading: schemas.SensorReadingCreate, db: Session = Depends(get_db)):
    crud.create_sensor_reading(db, reading)
    return reading

@app.post("/ingest/weather", response_model=schemas.WeatherReadingCreate)
def ingest_weather(reading: schemas.WeatherReadingCreate, db: Session = Depends(get_db)):
    crud.create_weather_reading(db, reading)
    return reading

@app.post("/ingest/image", response_model=schemas.ImageCreate)
def ingest_image(image: schemas.ImageCreate, db: Session = Depends(get_db)):
    crud.create_image(db, image)
    return image

@app.get("/field/{field_id}/latest", response_model=schemas.FieldSnapshotV1)
def get_field_snapshot(field_id: str, db: Session = Depends(get_db)):
    field = crud.get_field(db, field_id)
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    sensor = crud.get_latest_sensor_reading(db, field_id)
    weather = crud.get_latest_weather_reading(db, field_id)
    images = crud.get_latest_images(db, field_id)
    
    # Calculate derived weather data
    rainfall_24h = crud.get_rainfall_24h(db, field_id)
    forecast = crud.get_forecast_72h(db, field_id)

    missing_data = []
    if not sensor: missing_data.append("sensor_readings")
    if not weather: missing_data.append("weather")
    if not images: missing_data.append("images")
    if not forecast: missing_data.append("forecast_72h")

    # Construct sub-objects
    sensor_summary = None
    if sensor:
        sensor_summary = schemas.SensorSummary(
            ts=sensor.ts,
            moisture=sensor.moisture,
            ph=sensor.ph,
            n=sensor.n,
            p=sensor.p,
            k=sensor.k
        )

    weather_summary = None
    if weather:
        # Convert forecast DB objects to Pydantic models
        forecast_pt_list = [
            schemas.WeatherPoint(
                ts=pt.ts, temp_c=pt.temp_c, humidity_pct=pt.humidity_pct, rainfall_mm=pt.rainfall_mm
            ) for pt in forecast
        ] if forecast else []
        
        weather_summary = schemas.WeatherSummary(
            ts=weather.ts,
            temp_c=weather.temp_c,
            humidity_pct=weather.humidity_pct,
            rainfall_mm_24h=rainfall_24h,
            forecast_72h=forecast_pt_list
        )
    elif forecast:
         # Edge case: no current weather but has forecast?
         # Contract says weather is nullable. If null, we leave it null.
         pass

    image_list = [
        schemas.ImageSummary(
            ts=img.ts, source=img.source, rgb_url=img.rgb_url, notes=img.notes
        ) for img in images
    ]

    snapshot = schemas.FieldSnapshotV1(
        field_id=field.id,
        farmer_id=field.farmer_id,
        crop=field.crop,
        growth_stage=field.growth_stage,
        location=schemas.Location(lat=field.lat, lon=field.lon),
        snapshot_ts=datetime.utcnow(),
        sensor_readings=sensor_summary,
        weather=weather_summary,
        images=image_list,
        missing_data=missing_data # already list
    )
    
    return snapshot

@app.post("/recommend/{field_id}", response_model=schemas.RecommendationResponse)
def get_recommendation(field_id: str, db: Session = Depends(get_db)):
    # Reuse snapshot logic
    snapshot = get_field_snapshot(field_id, db)
    
    # ML Rainfall Prediction (LSTM)
    lstm_forecast = None
    ai_history = None
    try:
        # Fetch last 7 days weather
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=7)
        history = crud.get_weather_readings(db, field_id, start_date, end_date, limit=100)
        # Convert to dict list for service
        history_dicts = [{"temp_max": r.temp_max if hasattr(r, 'temp_max') else r.temp_c, 
                          "temp_min": r.temp_min if hasattr(r, 'temp_min') else r.temp_c - 5, 
                          "rain": r.rainfall_mm, 
                          "humidity": r.humidity_pct} for r in history]
        
        # Extract historical rainfall for visualization (last 7 days)
        ai_history = [d["rain"] for d in history_dicts[-7:]] if len(history_dicts) >= 7 else None
                          
        lstm_forecast = weather_ml_service.predict_next_3_days(field_id, history_dicts)
    except Exception as e:
        logger.error(f"LSTM Prediction failed: {e}")
        lstm_forecast = None
    
    rec_response = recommendation.generate_recommendation_logic(snapshot, lstm_forecast, ai_history)
    
    # Store recommendation
    db_rec = crud.create_recommendation(db, {
        "field_id": field_id,
        "ts": rec_response.ts,
        "action_json": {
            "irrigation": rec_response.irrigation.model_dump(),
            "fertilizer": rec_response.fertilizer.model_dump()
        },
        "data_completeness": rec_response.data_completeness,
        "why_json": rec_response.why
    })
    
    # Update response with ID
    rec_response.id = db_rec.id
    
    return rec_response

@app.post("/feedback", response_model=schemas.FeedbackResponse)
def submit_feedback(feedback: schemas.FeedbackCreate, db: Session = Depends(get_db)):
    return crud.create_feedback(db, feedback)

@app.get("/recommendations", response_model=List[schemas.RecommendationHistoryItem])
def list_recommendations(field_id: str, limit: int = 50, db: Session = Depends(get_db)):
    recs = crud.get_recommendations(db, field_id, limit)
    return recs

@app.get("/sensor_readings", response_model=List[schemas.SensorReadingCreate]) # SensorReadingCreate has ID? No.
# We need SensorReadingResponse with ID.
def list_sensor_readings(
    field_id: str, 
    start: datetime = datetime.utcnow() - timedelta(days=7), 
    end: datetime = datetime.utcnow(), 
    limit: int = 500, 
    db: Session = Depends(get_db)
):
    return crud.get_sensor_readings(db, field_id, start, end, limit)

@app.get("/weather_readings", response_model=List[schemas.WeatherReadingResponse])
def list_weather_readings(
    field_id: str, 
    start: datetime = datetime.utcnow() - timedelta(days=7), 
    end: datetime = datetime.utcnow(), 
    limit: int = 500, 
    db: Session = Depends(get_db)
):
    return crud.get_weather_readings(db, field_id, start, end, limit)

# Helper endpoint to bootstrap data for simulator (optional but helpful)
@app.post("/admin/create_field")
def admin_create_field(farmer_id: str, field_id: str, db: Session = Depends(get_db)):
    field = crud.ensure_farmer_field(db, farmer_id, field_id)
    return {"status": "ok", "field_id": field.id}

# --- Sensor Management Endpoints ---

@app.post("/sensors", response_model=schemas.SensorResponse)
def create_sensor(sensor: schemas.SensorCreate, db: Session = Depends(get_db)):
    return crud.create_sensor(db, sensor)

@app.get("/sensors", response_model=List[schemas.SensorResponse])
def list_sensors(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    sensors = crud.get_sensors(db, skip, limit)
    # Populate current assignments
    for s in sensors:
        assignment = crud.get_active_assignment(db, s.id)
        if assignment:
            # Enrich with field name
            field = crud.get_field(db, assignment.field_id)
            assign_resp = schemas.SensorAssignmentResponse.model_validate(assignment)
            if field:
                assign_resp.field_name = field.name
            s.current_assignment = assign_resp
    return sensors

@app.get("/sensors/{sensor_id}", response_model=schemas.SensorResponse)
def get_sensor(sensor_id: str, db: Session = Depends(get_db)):
    sensor = crud.get_sensor(db, sensor_id)
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
    
    assignment = crud.get_active_assignment(db, sensor_id)
    if assignment:
        field = crud.get_field(db, assignment.field_id)
        assign_resp = schemas.SensorAssignmentResponse.model_validate(assignment)
        if field:
            assign_resp.field_name = field.name
        sensor.current_assignment = assign_resp
        
    return sensor

@app.post("/sensors/{sensor_id}/assign", response_model=schemas.SensorAssignmentResponse)
def assign_sensor(sensor_id: str, assignment: schemas.AssignmentCreate, db: Session = Depends(get_db)):
    if sensor_id != assignment.sensor_id:
        raise HTTPException(status_code=400, detail="Sensor ID mismatch")
        
    sensor = crud.get_sensor(db, sensor_id)
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
        
    field = crud.get_field(db, assignment.field_id)
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    result = crud.assign_sensor(db, assignment)
    resp = schemas.SensorAssignmentResponse.model_validate(result)
    resp.field_name = field.name
    return resp

@app.post("/sensors/{sensor_id}/simulate", response_model=schemas.SensorSummary)
def simulate_sensor_data(sensor_id: str, db: Session = Depends(get_db)):
    assignment = crud.get_active_assignment(db, sensor_id)
    if not assignment:
        raise HTTPException(status_code=400, detail="Sensor not assigned to any field")
        
    import random
    
    # Generate random reading
    reading = schemas.SensorReadingCreate(
        field_id=assignment.field_id,
        sensor_id=sensor_id,
        ts=datetime.utcnow(),
        moisture=random.uniform(20.0, 60.0),
        ph=random.uniform(5.5, 7.5),
        n=random.uniform(10.0, 50.0),
        p=random.uniform(10.0, 50.0),
        k=random.uniform(10.0, 50.0)
    )
    
    db_reading = crud.create_sensor_reading(db, reading)
    
    return schemas.SensorSummary(
        ts=db_reading.ts,
        moisture=db_reading.moisture,
        ph=db_reading.ph,
        n=db_reading.n,
        p=db_reading.p,
        k=db_reading.k
    )
