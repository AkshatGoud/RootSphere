import requests
import datetime
import random
import json
import os
import time

# Configuration
API_URL = os.getenv("API_URL", "http://localhost:8000")

def gen_ts(offset_hours):
    return (datetime.datetime.utcnow() + datetime.timedelta(hours=offset_hours)).isoformat()

def run_seed():
    print(f"Creating 'Entrance' for Akshat at {API_URL}...")

    # 1. Register Akshat
    print("Registering Farmer Akshat...")
    akshat_payload = {
        "name": "Akshat",
        "email": "akshat@nomad.com", 
        "password": "password123",
        "phone": "9876543210",
        "language": "en"
    }
    
    # Try creating (might fail if exists, but we wiped DB so it should work)
    res = requests.post(f"{API_URL}/farmers", json=akshat_payload)
    if res.status_code == 200:
        farmer_data = res.json()
        farmer_id = farmer_data['id']
        print(f"✅ Created Farmer: {farmer_data['name']} (ID: {farmer_id})")
    elif res.status_code == 400 and "registered" in res.text:
        # If already exists (maybe from previous attempts), login
        print("User likely exists, logging in...")
        # We need ID. Login to get it.
        login_res = requests.post(f"{API_URL}/login", json={"email": "akshat@nomad.com", "password": "password123"})
        if login_res.status_code == 200:
            farmer_id = login_res.json()['farmer_id']
            print(f"✅ Logged in as: {farmer_id}")
        else:
            print("❌ Failed to login/register:", login_res.text)
            return
    else:
        print(f"❌ Failed to register: {res.text}")
        return

    # 2. Create Fields
    fields_to_create = [
        {
            "name": "Thanjavur Paddy",
            "crop": "Paddy (Rice)",
            "growth_stage": "Vegetative",
            "lat": 10.7870,
            "lon": 79.1378
        },
        {
            "name": "Coimbatore Cotton",
            "crop": "Cotton",
            "growth_stage": "Flowering",
            "lat": 11.0168,
            "lon": 76.9558
        },
         {
            "name": "Madurai Groundnut",
            "crop": "Groundnut (Peanut)",
            "growth_stage": "Harvest",
            "lat": 9.9252,
            "lon": 78.1198
        }
    ]

    for f_def in fields_to_create:
        print(f"\nProcessing Field: {f_def['name']}...")
        payload = {**f_def, "farmer_id": farmer_id}
        res = requests.post(f"{API_URL}/fields", json=payload)
        if res.status_code != 200:
            print(f"⚠️ Failed to create field {f_def['name']}: {res.text}")
            continue
        
        field_data = res.json()
        field_id = field_data['id']
        print(f"✅ Created Field: {field_id}")

        # 3. Create & Assign Sensor (New Flow)
        print("  Setting up Sensors...")
        sensor_name = f"Sensor-{f_def['name'][0:3]}"
        sensor_payload = {
            "name": sensor_name,
            "type": "Soil",
            "metrics": "n,p,k,ph,moisture",
            "status": "active"
        }
        sensor_res = requests.post(f"{API_URL}/sensors", json=sensor_payload)
        if sensor_res.status_code == 200:
            sensor_id = sensor_res.json()['id']
            # Assign
            requests.post(f"{API_URL}/sensors/{sensor_id}/assign", json={"sensor_id": sensor_id, "field_id": field_id})
            # Simulate Data (ML Input)
            print("  Simulating ML Data...")
            requests.post(f"{API_URL}/sensors/{sensor_id}/simulate")
            # Also add some manual history
        else:
            print("  ⚠️ Sensor creation failed")

        print("  Ingesting Sensor Readings (Last 24h)...")
        for i in range(12): # Every 2 hours
            offset = -24 + (i * 2)
            s_payload = {
                "field_id": field_id,
                "ts": gen_ts(offset),
                "moisture": random.uniform(20, 60),
                "ph": random.uniform(6.0, 7.5),
                "n": random.uniform(30, 80),
                "p": random.uniform(20, 50),
                "k": random.uniform(30, 60),
                "sensor_id": sensor_id if sensor_res.status_code == 200 else None
            }
            requests.post(f"{API_URL}/ingest/sensor", json=s_payload)

        print("  Ingesting Sample Images...")
        # Add a dummy image
        img_payload = {
            "field_id": field_id,
            "ts": gen_ts(0),
            "source": "mobile",
            "rgb_url": "https://images.unsplash.com/photo-1625246333195-5840507c8879?w=600&q=80", # Generic farm image
            "notes": "Weekly inspection"
        }
        requests.post(f"{API_URL}/ingest/image", json=img_payload)

        # 4. Generate Recommendation
        print("  Generating Recommendation...")
        rec_res = requests.post(f"{API_URL}/recommend/{field_id}")
        if rec_res.status_code == 200:
            rec_data = rec_res.json()
            ai_analysis = rec_data.get("ai_analysis", "N/A")
            print(f"  ✅ Recommendation generated. AI Analysis: {ai_analysis}")
        else:
            print("  ⚠️ Recommendation failed.")

    print("\n✅ Seed Complete for Akshat!")
    print("Credentials: akshat@nomad.com / password123")

if __name__ == "__main__":
    run_seed()
