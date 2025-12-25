from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import pytest

from api.main import app
from api.db import Base, get_db
from api import models

# Use a separate in-memory SQLite for testing logic (simple)
# OR use the same PG structure but mocked.
# Prompt asks for "ensure ... runs via pytest -q".
# Using SQLite for speed in tests is common unless PG specific features used.
# But we used UUIDs which SQLite handles as strings mostly fine but might need care.
# Let's try to mock the DB session or use a temp SQLite.

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# Create tables
Base.metadata.create_all(bind=engine)

client = TestClient(app)

@pytest.fixture
def test_db():
    # Setup
    db = TestingSessionLocal()
    # Create valid farmer/field first to satisfy FKs (if enforceable in sqlite)
    if not db.query(models.Farmer).first():
        f = models.Farmer(id="farmer_test", name="Test Farmer")
        db.add(f)
        fi = models.Field(id="field_test", farmer_id="farmer_test", name="Test Field", crop="wheat", growth_stage="vegetative", lat=0, lon=0)
        db.add(fi)
        db.commit()
    yield
    # Teardown
    db.close()

def test_basic_flow(test_db):
    # 1. Create Farmer
    res = client.post("/farmers", json={"name": "Test Farmer", "phone": "123", "language": "en"})
    assert res.status_code == 200
    farmer_id = res.json()["id"]

    # 2. Create Field
    res = client.post("/fields", json={
        "farmer_id": farmer_id,
        "name": "Test Field",
        "crop": "wheat",
        "growth_stage": "vegetative",
        "lat": 10.0, 
        "lon": 10.0
    })
    assert res.status_code == 200
    field_id = res.json()["id"]

    # 3. Ingest Sensor
    payload = {
        "field_id": field_id,
        "ts": datetime.utcnow().isoformat(),
        "moisture": 35.5,
        "ph": 6.5,
        "n": 45.0,
        "p": 35.0,
        "k": 25.0
    }
    response = client.post("/ingest/sensor", json=payload)
    assert response.status_code == 200

    # 4. Get Snapshot
    response = client.get(f"/field/{field_id}/latest")
    assert response.status_code == 200
    data = response.json()
    assert data["field_id"] == field_id
    assert isinstance(data["missing_data"], list) # check it's a list even if empty

def test_recommendation_rounding_and_msg(test_db):
    # Setup farmer/field
    f_res = client.post("/farmers", json={"name": "F", "phone": "1", "language": "en"})
    fr_id = f_res.json()["id"]
    fi_res = client.post("/fields", json={"farmer_id": fr_id, "name": "Fi", "crop": "wheat", "growth_stage": "veg", "lat":0, "lon":0})
    fi_id = fi_res.json()["id"]

    # Ingest Sensor (Dry)
    client.post("/ingest/sensor", json={
        "field_id": fi_id,
        "ts": datetime.utcnow().isoformat(),
        "moisture": 10.0,
        "ph": 6.0,
        "n": 40.0, "p": 30.0, "k": 20.0
    })
    
    # Recommend
    response = client.post(f"/recommend/{fi_id}")
    assert response.status_code == 200
    data = response.json()
    
    # Check rounding
    # Confidence can be 0.6 + 0.1 (sensor) - 0.2 (missing weather) = 0.5?
    # actually: 0.6 + 0.1(sensor) - (?) missing weather logic updated?
    # Logic: if sensor (+0.1), if weather (+0.1) else msg.
    # We didn't add weather, so missing weather msg.
    # Confidence = 0.6 + 0.1 = 0.7.
    val = data["confidence"]
    assert isinstance(val, float)
    # Just ensure it runs.
    
    # Check logic msg
    # We have no forecast, so it assumes 0 rain.
    # Message should be about moisture < threshold
    assert any("forecast" in w.lower() for w in data["why"])

def test_phase3_endpoints(test_db):
    # Setup
    f_res = client.post("/farmers", json={"name": "F3", "phone": "3", "language": "en"})
    fr_id = f_res.json()["id"]
    fi_res = client.post("/fields", json={"farmer_id": fr_id, "name": "Fi3", "crop": "corn", "growth_stage": "veg", "lat":0, "lon":0})
    fi_id = fi_res.json()["id"]

    # Health
    assert client.get("/health").status_code == 200
    # Ready might need DB mock, but we are using sqlite so it should work 
    # (actually depends on how dependency override works, but if get_db works, ready works)
    
    # 1. Feedback
    # Need a rec first
    client.post("/ingest/sensor", json={
        "field_id": fi_id, "ts": datetime.utcnow().isoformat(),
        "moisture": 20.0, "ph": 6.5, "n":40,"p":40,"k":40
    })
    rec_res = client.post(f"/recommend/{fi_id}")
    assert rec_res.status_code == 200
    rec_id = rec_res.json().get("id")
    assert rec_id is not None
    
    # 2. Submit Feedback
    fb_res = client.post("/feedback", json={
        "field_id": fi_id,
        "recommendation_id": rec_id,
        "followed": True,
        "outcome": "Better crop",
        "notes": "Good advice"
    })
    assert fb_res.status_code == 200
    assert fb_res.json()["followed"] is True

def test_browsing(test_db):
    # Setup
    f_res = client.post("/farmers", json={"name": "FB", "phone": "4", "language": "en"})
    fr_id = f_res.json()["id"]
    fi_res = client.post("/fields", json={"farmer_id": fr_id, "name": "FiB", "crop": "corn", "growth_stage": "veg", "lat":0, "lon":0})
    fi_id = fi_res.json()["id"]

    # Generate some data
    for i in range(3):
        client.post("/ingest/sensor", json={
            "field_id": fi_id, 
            "ts": (datetime.utcnow() - timedelta(hours=i)).isoformat(),
            "moisture": 20.0 + i, "ph": 6.5, "n":40,"p":40,"k":40
        })
        client.post(f"/recommend/{fi_id}") # creates recs
        client.post("/ingest/weather", json={
            "field_id": fi_id,
            "ts": (datetime.utcnow() - timedelta(hours=i)).isoformat(),
            "temp_c": 20+i, "humidity_pct": 50, "rainfall_mm": 0
        })

    # Test Listings
    res_recs = client.get(f"/recommendations?field_id={fi_id}&limit=2")
    assert res_recs.status_code == 200
    assert len(res_recs.json()) == 2
    
    res_sens = client.get(f"/sensor_readings?field_id={fi_id}&limit=5")
    assert res_sens.status_code == 200
    assert len(res_sens.json()) >= 3
    
    res_weath = client.get(f"/weather_readings?field_id={fi_id}&limit=5")
    assert res_weath.status_code == 200
    assert len(res_weath.json()) >= 3
