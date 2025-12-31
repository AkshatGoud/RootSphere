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

from typing import List, Optional

def generate_recommendation_logic(snapshot: schemas.FieldSnapshotV1, lstm_forecast: Optional[List[float]] = None, ai_history: Optional[List[float]] = None) -> schemas.RecommendationResponse:
    why_list = []
    data_completeness = 0.6
    risk_alert = None
    
    # 1. Calculate data completeness score (how much data we have)
    if snapshot.sensor_readings:
        data_completeness += 0.1
    else:
        data_completeness -= 0.2
        why_list.append("⚠️ Missing sensor readings (critical data).")
        
    if snapshot.weather:
        data_completeness += 0.1
    else:
        why_list.append("⚠️ Missing weather data (past 24h).")
        
    if snapshot.images:
        data_completeness += 0.1

    # Clamp and round
    data_completeness = round(max(0.0, min(1.0, data_completeness)), 2)

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
            # --- HYBRID DECISION LOGIC ---
            # 1. Extract Forecasts
            ai_rain_24h = 0.0
            ai_rain_48h = 0.0
            if lstm_forecast and len(lstm_forecast) >= 2:
                ai_rain_24h = float(lstm_forecast[0])
                ai_rain_48h = sum(lstm_forecast[:2])

            # 2. Conflict Detection (Risk Alert)
            risk_alert = None
            if abs(rainfall_next_24h - ai_rain_24h) > 5.0:
                risk_alert = "Uncertain weather: Forecasts disagree significantly."
            elif rainfall_next_24h < 1.0 and ai_rain_48h > 10.0:
                 risk_alert = "Warning: Heavy rain predicted soon."

            # 3. Arbitrator Decision
            # Rule A: If EITHER source predicts significant rain today (>2mm API or >3mm AI), DELAY.
            # Rationale: Better safe than wasting water if rain comes.
            will_rain_today = (rainfall_next_24h > 2.0) or (ai_rain_24h > 3.0)
            
            # Rule B: If dry today, but AI predicts STORM in 48h (>8mm), DELAY.
            # Rationale: AI spots approaching systems that API short-term might miss or lag on.
            storm_approaching = (rainfall_next_24h < 2.0) and (ai_rain_48h > 8.0)

            if will_rain_today:
                irrigation_action = "DELAY"
                irr_timing = "after rain"
                source = "API" if rainfall_next_24h > 2.0 else "AI Model"
                why_list.append(f"Rain predicted by {source} - save water")
            
            elif storm_approaching:
                irrigation_action = "DELAY"
                irr_timing = "until after storm"
                why_list.append("Storm approaching in 48h - wait")
            
            else:
                # Both agree it's dry
                irrigation_action = "IRRIGATE_NOW"
                irr_liters = IRRIGATION_LITERS.get(crop, 400.0)
                irr_timing = "now"
                irr_timing = "now"
                why_list.append("Weather is clear - safe to irrigate")

            if risk_alert:
                why_list.append(risk_alert)
        else:
            irrigation_action = "NO_ACTION"
            why_list.append(f"Moisture {moisture}% is sufficient (>= {thresh}%).")

    # 3. Scientific Fertilizer Logic (Primary: ICAR/TNAU Standards)
    fert_action = "NO_ACTION"
    n_rec = 0.0
    p_rec = 0.0
    k_rec = 0.0
    fert_timing = "N/A"
    ai_analysis = "ML Model Unavailable"

    if snapshot.sensor_readings:
        from .crop_nutrient_standards import check_nutrient_adequacy
        from .ml.model import classifier
        
        sr = snapshot.sensor_readings
        
        # Step 1: Check against scientific thresholds (PRIMARY)
        adequacy = check_nutrient_adequacy(
            crop=crop,
            growth_stage=stage,
            n=sr.n,
            p=sr.p,
            k=sr.k,
            ph=sr.ph,
            moisture=sr.moisture
        )
        
        # Step 2: Get ML prediction (SECONDARY - for confidence/validation)
        ai_analysis = classifier.predict(
            n=sr.n,
            p=sr.p,
            k=sr.k,
            ph=sr.ph,
            moisture=sr.moisture,
            crop=crop.capitalize()
        )
        
        # Step 3: Make decision based on scientific standards
        has_deficiency = len(adequacy["deficiencies"]) > 0
        
        if has_deficiency:
            fert_action = "APPLY"
            fert_timing = "next suitable day"
            
            # Explain each deficiency scientifically
            for deficiency_msg in adequacy["deficiencies"]:
                # Only add nutrient deficiencies to fertilizer recommendations
                # Moisture is handled by irrigation
                if "Nitrogen" in deficiency_msg or "Phosphorus" in deficiency_msg or "Potassium" in deficiency_msg or "pH" in deficiency_msg:
                    why_list.append(deficiency_msg)
            
            # Add source citation (moved to end for details)
            # Add source citation
            req = adequacy["requirements"]
            sources_str = "; ".join(req["sources"][:1])
            why_list.append(f"As per: {sources_str}")
            
            # ML confidence check
            ml_agrees = False
            if "Low Nitrogen" in ai_analysis and not adequacy["n_adequate"]:
                ml_agrees = True
            if "Low Phosphorus" in ai_analysis and not adequacy["p_adequate"]:
                ml_agrees = True
            if "Low Potassium" in ai_analysis and not adequacy["k_adequate"]:
                ml_agrees = True
            
            if ml_agrees:
                why_list.append(f"Digital check: Confirmed ({ai_analysis})")
            else:
                why_list.append(f"Digital check: Suggests '{ai_analysis}' - consider retesting")
            
            # Calculate fertilizer recommendations
            targets = FERTILIZER_TARGETS.get(crop, FERTILIZER_TARGETS["default"]).get(stage, FERTILIZER_TARGETS["default"]["default"])
            n_rec = targets["n"]
            p_rec = targets["p"]
            k_rec = targets["k"]
        else:
            why_list.append(f"Soil is healthy for {crop.capitalize()} ({stage} stage)")
            why_list.append(f"Digital check: {ai_analysis}")
            
            # Edge case: ML disagrees with scientific standards
            if "Low" in ai_analysis and not has_deficiency:
                why_list.append("Note: Digital check found potential issue - consider retesting")
                
    else:
        why_list.append("Cannot determine fertilizer needs without soil test.")

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
        data_completeness=data_completeness,
        why=why_list,
        ai_analysis=ai_analysis, 
        ai_forecast=lstm_forecast, # Pass the raw forecast data [day1, day2, day3]
        ai_history=ai_history, # Pass historical rainfall (last 7 days)
        risk_alert=risk_alert, # Pass hybrid logic alert
        snapshot_used=snapshot
    )
