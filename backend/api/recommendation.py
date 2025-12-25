from datetime import datetime, timedelta
from . import schemas

# --- Config / Thresholds ---
MOISTURE_THRESHOLDS = {
    "rice": 50.0,
    "wheat": 30.0,
    "maize": 25.0
}

IRRIGATION_LITERS = {
    "rice": 1000.0,
    "wheat": 500.0,
    "maize": 400.0
}

NUTRIENT_THRESHOLDS_LOW = {
    "n": 20.0,
    "p": 10.0,
    "k": 10.0
}

FERTILIZER_TARGETS = {
    "wheat": {
        "vegetative": {"n": 50.0, "p": 30.0, "k": 20.0},
        "flowering": {"n": 30.0, "p": 40.0, "k": 30.0}
    },
    "rice": {
        "vegetative": {"n": 60.0, "p": 30.0, "k": 30.0},
        "flowering": {"n": 40.0, "p": 40.0, "k": 40.0}
    },
    # Default fallback
    "default": {
        "default": {"n": 40.0, "p": 30.0, "k": 20.0}
    }
}

def generate_recommendation_logic(snapshot: schemas.FieldSnapshotV1) -> schemas.RecommendationResponse:
    why_list = []
    confidence = 0.6
    
    # 1. Adjust confidence based on data availability
    if snapshot.sensor_readings:
        confidence += 0.1
    else:
        confidence -= 0.2
        why_list.append("Missing sensor readings reduced confidence.")
        
    if snapshot.weather:
        confidence += 0.1
    else:
        why_list.append("Missing weather data (past 24h).")
        
    if snapshot.images:
        confidence += 0.1

    # Clamp confidence and round
    confidence = round(max(0.0, min(1.0, confidence)), 2)

    crop = snapshot.crop.lower()
    stage = snapshot.growth_stage.lower()

    # 2. Irrigation Logic
    irrigation_action = "UNKNOWN"
    irr_liters = 0.0
    irr_timing = "unknown"

    if not snapshot.sensor_readings:
        why_list.append("Cannot determine irrigation need without soil moisture.")
    else:
        moisture = snapshot.sensor_readings.moisture
        thresh = MOISTURE_THRESHOLDS.get(crop, 30.0)
        
        # Check rainfall forecast next 24h
        rainfall_next_24h = 0.0
        if snapshot.weather and snapshot.weather.forecast_72h:
            now = datetime.utcnow() # Note: snapshot.snapshot_ts might be better but let's compare logic
            # Logic: sum forecast where ts <= now + 24h
            # We assume forecast list is sorted or we iterate all
            # Since forecast_72h contains future points:
            # We need to filter those within next 24h of the snapshot time?
            # The prompt says "compute rainfall_next_24h from forecast_72h points whose ts <= now+24h"
            # We will use snapshot.snapshot_ts as "now" for consistency if available, or just iterate.
            
            # Simplified: just sum first 4 points if they are 6-hourly?
            # Or iterate checking timestamps.
            limit_ts = snapshot.snapshot_ts.replace(tzinfo=None) + timedelta(hours=24)
            for pt in snapshot.weather.forecast_72h:
                # remove tz for comparison if needed
                pt_ts = pt.ts.replace(tzinfo=None)
                if pt_ts <= limit_ts:
                    rainfall_next_24h += pt.rainfall_mm
        else:
            why_list.append("No weather forecast available; assuming 0 rain.")

        if moisture < thresh:
            if rainfall_next_24h < 2.0:
                irrigation_action = "IRRIGATE_NOW"
                irr_liters = IRRIGATION_LITERS.get(crop, 400.0)
                irr_timing = "now"
                why_list.append(f"Moisture {moisture}% < threshold {thresh}% and low next 24h rain forecast ({rainfall_next_24h}mm).")
            else:
                irrigation_action = "DELAY"
                irr_timing = "after rain"
                why_list.append(f"Moisture low but rain forecast in next 24h ({rainfall_next_24h}mm) -> Delay irrigation.")
        else:
            irrigation_action = "NO_ACTION"
            why_list.append(f"Moisture {moisture}% is sufficient (>= {thresh}%).")

    # 3. Fertilizer Logic
    fert_action = "NO_ACTION"
    n_rec = 0.0
    p_rec = 0.0
    k_rec = 0.0
    fert_timing = "N/A"

    if snapshot.sensor_readings:
        sr = snapshot.sensor_readings
        low = False
        if sr.n < NUTRIENT_THRESHOLDS_LOW["n"]: low = True
        if sr.p < NUTRIENT_THRESHOLDS_LOW["p"]: low = True
        if sr.k < NUTRIENT_THRESHOLDS_LOW["k"]: low = True
        
        if low:
            fert_action = "APPLY"
            fert_timing = "next suitable day"
            why_list.append("Detected nutrient deficiency (N, P, or K below threshold).")
            
            # Lookup targets
            targets = FERTILIZER_TARGETS.get(crop, FERTILIZER_TARGETS["default"]).get(stage, FERTILIZER_TARGETS["default"]["default"])
            n_rec = targets["n"]
            p_rec = targets["p"]
            k_rec = targets["k"]
        else:
            why_list.append("Nutrient levels are adequate.")
            
        # pH check
        if sr.ph < 5.5:
            why_list.append(f"pH {sr.ph} is low (acidic). Consider lime application.")
        elif sr.ph > 7.8:
            why_list.append(f"pH {sr.ph} is high (alkaline). Consider sulfur/gypsum.")
    else:
        why_list.append("Cannot determine fertilizer needs without soil test.")

    # ML Analysis
    ai_analysis = "ML Model Unavailable"
    if snapshot.sensor_readings:
        from .ml.model import classifier
        ai_analysis = classifier.predict(
            n=snapshot.sensor_readings.n,
            p=snapshot.sensor_readings.p,
            k=snapshot.sensor_readings.k,
            ph=snapshot.sensor_readings.ph,
            moisture=snapshot.sensor_readings.moisture,
            crop=crop.capitalize()
        )
        why_list.append(f"AI Soil Analysis: {ai_analysis}")

    # Construct response
    return schemas.RecommendationResponse(
        field_id=snapshot.field_id,
        ts=datetime.utcnow(),
        irrigation=schemas.IrrigationAction(
            action=irrigation_action,
            liters_per_acre=irr_liters,
            timing=irr_timing
        ),
        fertilizer=schemas.FertilizerAction(
            action=fert_action,
            n_kg_acre=n_rec,
            p_kg_acre=p_rec,
            k_kg_acre=k_rec,
            timing=fert_timing
        ),
        confidence=confidence,
        why=why_list,
        ai_analysis=ai_analysis, # New Field
        snapshot_used=snapshot
    )
