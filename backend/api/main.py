from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from datetime import datetime, timedelta
from .services.weather_ml import weather_ml_service
from .services.auth import get_current_farmer

import time
import uuid
import json
import logging
import os

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

# Static file serving for uploaded images
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

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

# --- Public Auth Endpoints ---

@app.post("/farmers", response_model=schemas.FarmerResponse)
def create_farmer(farmer: schemas.FarmerCreate, db: Session = Depends(get_db)):
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

@app.post("/login/token", response_model=schemas.Token, include_in_schema=False)
def login_oauth2(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """OAuth2-compatible login for Swagger UI. Email goes in the 'username' field."""
    farmer = crud.get_farmer_by_email(db, form_data.username)
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

    import random
    code = f"{random.randint(100000, 999999)}"

    farmer.reset_code = code
    farmer.reset_expires = datetime.utcnow() + timedelta(minutes=15)
    db.commit()

    from .services.email import send_reset_code
    send_reset_code(req.email, code)

    return {"message": "Reset code sent to your email."}

@app.post("/auth/reset-password")
def reset_password(req: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    farmer = crud.get_farmer_by_email(db, req.email)
    if not farmer:
        raise HTTPException(status_code=400, detail="Invalid request")

    if not farmer.reset_code or farmer.reset_code != req.code:
        raise HTTPException(status_code=400, detail="Invalid code")

    if farmer.reset_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Code expired")

    hashed_pwd = auth_service.get_password_hash(req.new_password)
    farmer.password_hash = hashed_pwd
    farmer.reset_code = None
    farmer.reset_expires = None
    db.commit()

    return {"message": "Password updated successfully"}

# --- Protected Endpoints ---

@app.get("/farmers/{farmer_id}", response_model=schemas.FarmerResponse)
def read_farmer(farmer_id: str, db: Session = Depends(get_db), farmer: models.Farmer = Depends(get_current_farmer)):
    if farmer_id != farmer.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return farmer

@app.put("/farmers/{farmer_id}", response_model=schemas.FarmerResponse)
def update_farmer(farmer_id: str, farmer_update: schemas.FarmerUpdate, db: Session = Depends(get_db), farmer: models.Farmer = Depends(get_current_farmer)):
    if farmer_id != farmer.id:
        raise HTTPException(status_code=403, detail="Access denied")
    db_farmer = crud.update_farmer(db, farmer_id, farmer_update)
    if db_farmer is None:
        raise HTTPException(status_code=404, detail="Farmer not found")
    return db_farmer

@app.post("/fields", response_model=schemas.FieldResponse)
def create_field(field: schemas.FieldCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), farmer: models.Farmer = Depends(get_current_farmer)):
    # Override farmer_id from token
    field.farmer_id = farmer.id

    db_field = crud.create_field(db, field)

    try:
        current, forecast = weather_service.fetch_live_weather(db_field.lat, db_field.lon, db_field.id)
        if current:
            crud.create_weather_reading(db, current)
        for f in forecast:
            crud.create_weather_reading(db, f)
    except Exception as e:
        logger.error(f"Weather fetch error: {e}")

    background_tasks.add_task(weather_ml_service.train_model_for_field, db_field.id, db_field.lat, db_field.lon)

    return db_field

@app.get("/fields/{field_id}", response_model=schemas.FieldResponse)
def read_field(field_id: str, db: Session = Depends(get_db), farmer: models.Farmer = Depends(get_current_farmer)):
    db_field = crud.get_field_for_farmer(db, field_id, farmer.id)
    if db_field is None:
        raise HTTPException(status_code=404, detail="Field not found")
    return db_field

@app.put("/fields/{field_id}", response_model=schemas.FieldResponse)
def update_field(field_id: str, field_update: schemas.FieldUpdate, db: Session = Depends(get_db), farmer: models.Farmer = Depends(get_current_farmer)):
    if not crud.get_field_for_farmer(db, field_id, farmer.id):
        raise HTTPException(status_code=404, detail="Field not found")
    db_field = crud.update_field(db, field_id, field_update)
    if not db_field:
        raise HTTPException(status_code=404, detail="Field not found")

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

@app.delete("/fields/{field_id}")
def delete_field(field_id: str, db: Session = Depends(get_db), farmer: models.Farmer = Depends(get_current_farmer)):
    deleted = crud.delete_field(db, field_id, farmer.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Field not found")
    return {"message": "Field deleted"}

@app.get("/fields", response_model=List[schemas.FieldResponse])
def list_fields(db: Session = Depends(get_db), farmer: models.Farmer = Depends(get_current_farmer)):
    return crud.get_fields_by_farmer(db, farmer.id)

@app.post("/ingest/sensor", response_model=schemas.SensorReadingCreate)
def ingest_sensor(reading: schemas.SensorReadingCreate, db: Session = Depends(get_db), farmer: models.Farmer = Depends(get_current_farmer)):
    if not crud.get_field_for_farmer(db, reading.field_id, farmer.id):
        raise HTTPException(status_code=404, detail="Field not found")
    crud.create_sensor_reading(db, reading)
    return reading

@app.post("/ingest/weather", response_model=schemas.WeatherReadingCreate)
def ingest_weather(reading: schemas.WeatherReadingCreate, db: Session = Depends(get_db), farmer: models.Farmer = Depends(get_current_farmer)):
    if not crud.get_field_for_farmer(db, reading.field_id, farmer.id):
        raise HTTPException(status_code=404, detail="Field not found")
    crud.create_weather_reading(db, reading)
    return reading

@app.post("/ingest/image", response_model=schemas.ImageResponse)
def ingest_image(image: schemas.ImageCreate, db: Session = Depends(get_db), farmer: models.Farmer = Depends(get_current_farmer)):
    if not crud.get_field_for_farmer(db, image.field_id, farmer.id):
        raise HTTPException(status_code=404, detail="Field not found")
    db_image = crud.create_image(db, image)
    return db_image

@app.post("/upload/image", response_model=schemas.ImageResponse)
async def upload_image_file(
    field_id: str = Form(...),
    notes: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    farmer: models.Farmer = Depends(get_current_farmer),
):
    if not crud.get_field_for_farmer(db, field_id, farmer.id):
        raise HTTPException(status_code=404, detail="Field not found")

    # Validate file type
    allowed = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WebP images are allowed")

    import base64
    contents = await file.read()

    # Also save to local uploads dir (for local dev)
    ext = file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(UPLOADS_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(contents)

    # Store as base64 data URL in DB (works on Render without persistent disk)
    mime = file.content_type or "image/jpeg"
    rgb_url = f"data:{mime};base64,{base64.b64encode(contents).decode()}"

    image_data = schemas.ImageCreate(
        field_id=field_id,
        ts=datetime.utcnow(),
        source="phone",
        rgb_url=rgb_url,
        notes=notes.strip(),
    )
    db_image = crud.create_image(db, image_data)
    return db_image

@app.delete("/images/{image_id}")
def delete_image(image_id: str, db: Session = Depends(get_db), farmer: models.Farmer = Depends(get_current_farmer)):
    image = db.query(models.Image).filter(models.Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    if not crud.get_field_for_farmer(db, image.field_id, farmer.id):
        raise HTTPException(status_code=403, detail="Access denied")
    crud.delete_image(db, image_id)
    return {"message": "Image deleted successfully"}

@app.post("/analyze/image")
def analyze_image(
    image_id: str = Form(None),
    field_id: str = Form(None),
    crop_name: str = Form(""),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    farmer: models.Farmer = Depends(get_current_farmer),
):
    """
    Test image analysis directly. Provide either:
    - image_id: analyze an already-uploaded image
    - file + crop_name: upload and analyze in one step
    - field_id: analyze the most recent image on a field
    Returns the raw AI analysis result.
    """
    from .ml.image_model import analyze_crop_image

    image_url = None
    notes = ""

    if image_id:
        img = db.query(models.Image).filter(models.Image.id == image_id).first()
        if not img:
            raise HTTPException(status_code=404, detail="Image not found")
        if not crud.get_field_for_farmer(db, img.field_id, farmer.id):
            raise HTTPException(status_code=403, detail="Access denied")
        image_url = img.rgb_url
        notes = img.notes or ""
        if not crop_name:
            field = crud.get_field(db, img.field_id)
            crop_name = field.crop if field and field.crop else "unknown"
    elif field_id:
        if not crud.get_field_for_farmer(db, field_id, farmer.id):
            raise HTTPException(status_code=404, detail="Field not found")
        images = crud.get_latest_images(db, field_id)
        if not images:
            raise HTTPException(status_code=404, detail="No images found for this field")
        image_url = images[0].rgb_url
        notes = images[0].notes or ""
        if not crop_name:
            field = crud.get_field(db, field_id)
            crop_name = field.crop if field and field.crop else "unknown"
    elif file:
        allowed = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
        if file.content_type not in allowed:
            raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WebP images are allowed")
        import base64
        contents = file.file.read()
        mime = file.content_type or "image/jpeg"
        image_url = f"data:{mime};base64,{base64.b64encode(contents).decode()}"
        crop_name = crop_name or "unknown"
    else:
        raise HTTPException(status_code=400, detail="Provide image_id, field_id, or upload a file")

    result = analyze_crop_image(image_url=image_url, notes=notes, crop_name=crop_name)
    return result

@app.get("/field/{field_id}/latest", response_model=schemas.FieldSnapshotV1)
def get_field_snapshot(field_id: str, db: Session = Depends(get_db), farmer: models.Farmer = Depends(get_current_farmer)):
    field = crud.get_field_for_farmer(db, field_id, farmer.id)
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    sensor = crud.get_latest_sensor_reading(db, field_id)
    weather = crud.get_latest_weather_reading(db, field_id)
    images = crud.get_latest_images(db, field_id)

    rainfall_24h = crud.get_rainfall_24h(db, field_id)
    forecast = crud.get_forecast_72h(db, field_id)

    missing_data = []
    if not sensor: missing_data.append("sensor_readings")
    if not weather: missing_data.append("weather")
    if not images: missing_data.append("images")
    if not forecast: missing_data.append("forecast_72h")

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

    image_list = [
        schemas.ImageSummary(
            id=img.id,
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
        missing_data=missing_data
    )

    return snapshot

@app.post("/recommend/{field_id}", response_model=schemas.RecommendationResponse)
def get_recommendation(field_id: str, db: Session = Depends(get_db), farmer: models.Farmer = Depends(get_current_farmer)):
    snapshot = get_field_snapshot(field_id, db, farmer)

    lstm_forecast = None
    ai_history = None
    try:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=7)
        history = crud.get_weather_readings(db, field_id, start_date, end_date, limit=100)
        history_dicts = [{"temp_max": r.temp_max if hasattr(r, 'temp_max') else r.temp_c,
                          "temp_min": r.temp_min if hasattr(r, 'temp_min') else r.temp_c - 5,
                          "rain": r.rainfall_mm,
                          "humidity": r.humidity_pct} for r in history]

        ai_history = [d["rain"] for d in history_dicts[-7:]] if len(history_dicts) >= 7 else None

        lstm_forecast = weather_ml_service.predict_ensemble(
            field_id, snapshot.location.lat, snapshot.location.lon, history_dicts
        )
    except Exception as e:
        logger.error(f"Weather prediction failed: {e}")
        lstm_forecast = None

    rec_response = recommendation.generate_recommendation_logic(snapshot, lstm_forecast, ai_history)

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

    rec_response.id = db_rec.id

    return rec_response

@app.post("/feedback", response_model=schemas.FeedbackResponse)
def submit_feedback(feedback: schemas.FeedbackCreate, db: Session = Depends(get_db), farmer: models.Farmer = Depends(get_current_farmer)):
    if not crud.get_field_for_farmer(db, feedback.field_id, farmer.id):
        raise HTTPException(status_code=404, detail="Field not found")
    return crud.create_feedback(db, feedback)

@app.get("/recommendations", response_model=List[schemas.RecommendationHistoryItem])
def list_recommendations(field_id: str, limit: int = 50, db: Session = Depends(get_db), farmer: models.Farmer = Depends(get_current_farmer)):
    if not crud.get_field_for_farmer(db, field_id, farmer.id):
        raise HTTPException(status_code=404, detail="Field not found")
    recs = crud.get_recommendations(db, field_id, limit)
    return recs

@app.get("/sensor_readings", response_model=List[schemas.SensorReadingCreate])
def list_sensor_readings(
    field_id: str,
    start: datetime = datetime.utcnow() - timedelta(days=7),
    end: datetime = datetime.utcnow(),
    limit: int = 500,
    db: Session = Depends(get_db),
    farmer: models.Farmer = Depends(get_current_farmer)
):
    if not crud.get_field_for_farmer(db, field_id, farmer.id):
        raise HTTPException(status_code=404, detail="Field not found")
    return crud.get_sensor_readings(db, field_id, start, end, limit)

@app.get("/weather_readings", response_model=List[schemas.WeatherReadingResponse])
def list_weather_readings(
    field_id: str,
    start: datetime = datetime.utcnow() - timedelta(days=7),
    end: datetime = datetime.utcnow(),
    limit: int = 500,
    db: Session = Depends(get_db),
    farmer: models.Farmer = Depends(get_current_farmer)
):
    if not crud.get_field_for_farmer(db, field_id, farmer.id):
        raise HTTPException(status_code=404, detail="Field not found")
    return crud.get_weather_readings(db, field_id, start, end, limit)

# Admin/simulator endpoint (kept unprotected for internal use)
@app.post("/admin/create_field")
def admin_create_field(farmer_id: str, field_id: str, db: Session = Depends(get_db)):
    field = crud.ensure_farmer_field(db, farmer_id, field_id)
    return {"status": "ok", "field_id": field.id}

# --- Sensor Management Endpoints (Protected) ---

@app.post("/sensors", response_model=schemas.SensorResponse)
def create_sensor(sensor: schemas.SensorCreate, db: Session = Depends(get_db), farmer: models.Farmer = Depends(get_current_farmer)):
    return crud.create_sensor(db, sensor, farmer_id=farmer.id)

@app.get("/sensors", response_model=List[schemas.SensorResponse])
def list_sensors(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), farmer: models.Farmer = Depends(get_current_farmer)):
    sensors = crud.get_sensors(db, farmer_id=farmer.id, skip=skip, limit=limit)
    for s in sensors:
        assignment = crud.get_active_assignment(db, s.id)
        if assignment:
            field = crud.get_field(db, assignment.field_id)
            assign_resp = schemas.SensorAssignmentResponse.model_validate(assignment)
            if field:
                assign_resp.field_name = field.name
            s.current_assignment = assign_resp
    return sensors

@app.get("/sensors/{sensor_id}", response_model=schemas.SensorResponse)
def get_sensor(sensor_id: str, db: Session = Depends(get_db), farmer: models.Farmer = Depends(get_current_farmer)):
    sensor = crud.get_sensor(db, sensor_id, farmer_id=farmer.id)
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

@app.delete("/sensors/{sensor_id}")
def delete_sensor(sensor_id: str, db: Session = Depends(get_db), farmer: models.Farmer = Depends(get_current_farmer)):
    deleted = crud.delete_sensor(db, sensor_id, farmer.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Sensor not found")
    return {"message": "Sensor deleted"}

@app.post("/sensors/{sensor_id}/assign", response_model=schemas.SensorAssignmentResponse)
def assign_sensor(sensor_id: str, assignment: schemas.AssignmentCreate, db: Session = Depends(get_db), farmer: models.Farmer = Depends(get_current_farmer)):
    if sensor_id != assignment.sensor_id:
        raise HTTPException(status_code=400, detail="Sensor ID mismatch")

    sensor = crud.get_sensor(db, sensor_id, farmer_id=farmer.id)
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")

    field = crud.get_field_for_farmer(db, assignment.field_id, farmer.id)
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    result = crud.assign_sensor(db, assignment)
    resp = schemas.SensorAssignmentResponse.model_validate(result)
    resp.field_name = field.name
    return resp

# --- Crop recommendation dataset cache for realistic simulation ---
_crop_data_cache: dict = {}

# Maps canonical crop names to dataset labels in crop_recommendation.csv
_CROP_TO_DATASET_LABEL = {
    "rice": "rice",
    "cotton": "cotton",
    "maize": "maize",
    "sorghum": "jute",       # closest grain crop in dataset
    "groundnut": "mungbean", # both legumes, similar low-N profile
    "wheat": "maize",        # similar nutrient needs
}

def _load_crop_data() -> dict:
    """Load crop_recommendation.csv once, return {label: list_of_row_dicts}."""
    if _crop_data_cache:
        return _crop_data_cache
    import csv
    csv_path = os.path.join(os.path.dirname(__file__), "..", "scripts", "data", "crop_recommendation.csv")
    with open(csv_path, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            label = row["label"].strip().lower()
            parsed = {
                "n": float(row["N"]),
                "p": float(row["P"]),
                "k": float(row["K"]),
                "ph": float(row["ph"]),
                "moisture": float(row["humidity"]),
            }
            _crop_data_cache.setdefault(label, []).append(parsed)
    return _crop_data_cache


@app.post("/sensors/{sensor_id}/simulate", response_model=schemas.SensorSummary)
def simulate_sensor_data(sensor_id: str, db: Session = Depends(get_db), farmer: models.Farmer = Depends(get_current_farmer)):
    import random

    sensor = crud.get_sensor(db, sensor_id, farmer_id=farmer.id)
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")

    assignment = crud.get_active_assignment(db, sensor_id)
    if not assignment:
        raise HTTPException(status_code=400, detail="Sensor not assigned to any field")

    # --- 1. Get field context ---
    field = crud.get_field(db, assignment.field_id)
    crop_key = recommendation._normalize_crop(field.crop) if field and field.crop else ""
    dataset_label = _CROP_TO_DATASET_LABEL.get(crop_key)

    # --- 2. Load real crop data and sample a row ---
    crop_data = _load_crop_data()
    pool = crop_data.get(dataset_label) if dataset_label else None
    if not pool:
        # Unknown crop — sample from entire dataset
        pool = [row for rows in crop_data.values() for row in rows]
    sample = dict(random.choice(pool))

    # --- 3. Scenario overlay (weighted random) ---
    scenario = random.choices(
        ["realistic", "deficiency", "ph_drift", "drought", "excellent", "multiple"],
        weights=[40, 20, 10, 10, 10, 10],
    )[0]

    def apply_scenario(vals: dict, scenario_name: str) -> None:
        if scenario_name == "realistic":
            pass
        elif scenario_name == "deficiency":
            nutrient = random.choice(["n", "p", "k"])
            vals[nutrient] *= random.uniform(0.3, 0.6)
        elif scenario_name == "ph_drift":
            vals["ph"] += random.choice([-1, 1]) * random.uniform(1.0, 2.0)
        elif scenario_name == "drought":
            vals["moisture"] = random.uniform(5.0, 15.0)
        elif scenario_name == "excellent":
            boost = random.uniform(1.3, 1.5)
            for k in ("n", "p", "k"):
                vals[k] *= boost
        elif scenario_name == "multiple":
            # Combine 2 random sub-scenarios
            subs = random.sample(["deficiency", "ph_drift", "drought", "excellent"], 2)
            for s in subs:
                apply_scenario(vals, s)

    apply_scenario(sample, scenario)

    # --- 4. Sensor noise (±2-5% Gaussian) ---
    for key in ("n", "p", "k", "ph", "moisture"):
        noise_pct = random.gauss(0, 0.035)  # ~3.5% std dev
        sample[key] *= (1 + noise_pct)

    # --- 5. Temporal continuity: blend with last reading ---
    last = crud.get_latest_sensor_reading(db, assignment.field_id)
    if last:
        blend = 0.3
        sample["n"] = sample["n"] * (1 - blend) + last.n * blend
        sample["p"] = sample["p"] * (1 - blend) + last.p * blend
        sample["k"] = sample["k"] * (1 - blend) + last.k * blend
        sample["ph"] = sample["ph"] * (1 - blend) + last.ph * blend
        sample["moisture"] = sample["moisture"] * (1 - blend) + last.moisture * blend

    # --- 6. Clamp to physical bounds ---
    sample["n"] = max(0, round(sample["n"], 2))
    sample["p"] = max(0, round(sample["p"], 2))
    sample["k"] = max(0, round(sample["k"], 2))
    sample["ph"] = round(max(0, min(14, sample["ph"])), 2)
    sample["moisture"] = round(max(0, min(100, sample["moisture"])), 2)

    reading = schemas.SensorReadingCreate(
        field_id=assignment.field_id,
        sensor_id=sensor_id,
        ts=datetime.utcnow(),
        moisture=sample["moisture"],
        ph=sample["ph"],
        n=sample["n"],
        p=sample["p"],
        k=sample["k"],
    )

    db_reading = crud.create_sensor_reading(db, reading)

    return schemas.SensorSummary(
        ts=db_reading.ts,
        moisture=db_reading.moisture,
        ph=db_reading.ph,
        n=db_reading.n,
        p=db_reading.p,
        k=db_reading.k,
    )
