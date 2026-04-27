from datetime import datetime, timedelta
from . import schemas
from typing import List, Optional

# --- Crop Name Normalization ---
# Maps regional/vernacular variants (Hindi, Tamil, Telugu, common trade names)
# to a canonical lowercase key that the rest of the engine works against.
# Add lowercase ASCII transliterations alongside native scripts so users can
# type either way.
_CROP_NAME_MAP = {
    # rice / paddy
    "rice": "rice",
    "paddy": "rice",
    "paddy (rice)": "rice",
    "chawal": "rice",        # Hindi
    "dhan": "rice",           # Hindi (paddy)
    "chaval": "rice",
    "arisi": "rice",          # Tamil
    "nellu": "rice",          # Tamil/Malayalam
    "biyyam": "rice",         # Telugu
    "vari": "rice",           # Marathi/Konkani
    "धान": "rice",
    "चावल": "rice",
    "அரிசி": "rice",
    "நெல்": "rice",
    "బియ్యం": "rice",
    "వరి": "rice",

    # wheat
    "wheat": "wheat",
    "gehu": "wheat",          # Hindi
    "gehoon": "wheat",
    "godhumai": "wheat",      # Tamil
    "godumalu": "wheat",      # Telugu
    "गेहूँ": "wheat",
    "गेहू": "wheat",
    "கோதுமை": "wheat",
    "గోధుమలు": "wheat",

    # maize / corn
    "maize": "maize",
    "corn": "maize",
    "makka": "maize",         # Hindi
    "makka cholam": "maize",  # Tamil — literally "corn-sorghum"
    "makka jola": "maize",    # Kannada/Telugu
    "mokka jonna": "maize",   # Telugu
    "मक्का": "maize",
    "மக்காச்சோளம்": "maize",
    "మొక్కజొన్న": "maize",

    # cotton
    "cotton": "cotton",
    "kapas": "cotton",        # Hindi
    "panju": "cotton",        # Tamil
    "patti": "cotton",        # Telugu
    "कपास": "cotton",
    "பஞ்சு": "cotton",
    "ప్రత్తి": "cotton",

    # groundnut / peanut
    "groundnut": "groundnut",
    "peanut": "groundnut",
    "groundnut (peanut)": "groundnut",
    "moongphali": "groundnut",   # Hindi
    "mungfali": "groundnut",
    "verkadalai": "groundnut",   # Tamil — literally "root-pulse"
    "nilakkadalai": "groundnut", # Tamil
    "veru senaga": "groundnut",  # Telugu
    "palli": "groundnut",        # Telugu (regional)
    "मूँगफली": "groundnut",
    "वेर்க்கடலை": "groundnut",
    "வேர்க்கடலை": "groundnut",
    "నిలక్కడలై": "groundnut",
    "వేరుసెనగ": "groundnut",

    # sorghum / jowar
    "sorghum": "sorghum",
    "jowar": "sorghum",       # Hindi/Marathi
    "jonna": "sorghum",       # Telugu
    "cholam": "sorghum",      # Tamil
    "cholam (sorghum)": "sorghum",
    "ज्वार": "sorghum",
    "சோளம்": "sorghum",
    "జొన్న": "sorghum",
}

def _normalize_crop(raw_crop: str) -> str:
    """Normalize any crop name variant to canonical lowercase key."""
    return _CROP_NAME_MAP.get(raw_crop.lower().strip(), raw_crop.lower().strip())

# Canonical crop name → classifier column name
_CROP_CLASSIFIER_MAP = {
    "rice": "Rice",
    "wheat": "Wheat",
    "maize": "Maize",
    "cotton": "Cotton",
    "groundnut": "Groundnut",
    "sorghum": "Sorghum",
}

# --- Config / Thresholds ---
MOISTURE_THRESHOLDS = {
    "rice": 50.0,
    "wheat": 30.0,
    "maize": 25.0,
    "cotton": 25.0,
    "groundnut": 25.0,
    "sorghum": 20.0,
}

IRRIGATION_LITERS = {
    "rice": 1000.0,
    "wheat": 500.0,
    "maize": 400.0,
    "cotton": 400.0,
    "groundnut": 350.0,
    "sorghum": 300.0,
}

NUTRIENT_THRESHOLDS_LOW = {
    "n": 20.0,
    "p": 10.0,
    "k": 10.0
}

FERTILIZER_TARGETS = {
    "wheat": {
        "seedling": {"n": 20.0, "p": 35.0, "k": 15.0},   # Low N (burn risk), high P (roots)
        "vegetative": {"n": 50.0, "p": 30.0, "k": 20.0},
        "flowering": {"n": 30.0, "p": 40.0, "k": 30.0},
        "fruiting": {"n": 20.0, "p": 35.0, "k": 35.0},
        "mature": {"n": 0.0, "p": 0.0, "k": 0.0},
        "harvest": {"n": 0.0, "p": 0.0, "k": 0.0}
    },
    "rice": {
        "seedling": {"n": 25.0, "p": 35.0, "k": 15.0},   # Starter dose for nursery
        "vegetative": {"n": 60.0, "p": 30.0, "k": 30.0},
        "flowering": {"n": 40.0, "p": 40.0, "k": 40.0},
        "fruiting": {"n": 20.0, "p": 35.0, "k": 45.0},
        "mature": {"n": 0.0, "p": 0.0, "k": 0.0},
        "harvest": {"n": 0.0, "p": 0.0, "k": 0.0}
    },
    "maize": {
        "seedling": {"n": 20.0, "p": 35.0, "k": 15.0},
        "vegetative": {"n": 55.0, "p": 30.0, "k": 25.0},
        "flowering": {"n": 35.0, "p": 35.0, "k": 35.0},
        "fruiting": {"n": 25.0, "p": 30.0, "k": 40.0},
        "mature": {"n": 0.0, "p": 0.0, "k": 0.0},
        "harvest": {"n": 0.0, "p": 0.0, "k": 0.0}
    },
    "cotton": {
        "seedling": {"n": 15.0, "p": 30.0, "k": 15.0},
        "vegetative": {"n": 50.0, "p": 25.0, "k": 25.0},
        "flowering": {"n": 30.0, "p": 30.0, "k": 30.0},
        "fruiting": {"n": 20.0, "p": 25.0, "k": 40.0},
        "mature": {"n": 0.0, "p": 0.0, "k": 0.0},
        "harvest": {"n": 0.0, "p": 0.0, "k": 0.0}
    },
    "groundnut": {
        "seedling": {"n": 5.0, "p": 35.0, "k": 15.0},    # Legume: minimal N, high P for nodules
        "vegetative": {"n": 10.0, "p": 30.0, "k": 20.0},
        "flowering": {"n": 10.0, "p": 35.0, "k": 25.0},
        "fruiting": {"n": 5.0, "p": 35.0, "k": 30.0},
        "mature": {"n": 0.0, "p": 0.0, "k": 0.0},
        "harvest": {"n": 0.0, "p": 0.0, "k": 0.0}
    },
    "sorghum": {
        "seedling": {"n": 15.0, "p": 30.0, "k": 15.0},
        "vegetative": {"n": 45.0, "p": 25.0, "k": 20.0},
        "flowering": {"n": 30.0, "p": 30.0, "k": 25.0},
        "fruiting": {"n": 20.0, "p": 25.0, "k": 30.0},
        "mature": {"n": 0.0, "p": 0.0, "k": 0.0},
        "harvest": {"n": 0.0, "p": 0.0, "k": 0.0}
    },
    # Default fallback
    "default": {
        "default": {"n": 40.0, "p": 30.0, "k": 20.0}
    }
}

# Seedling-specific moisture thresholds (irrigate sooner — seedlings are more sensitive)
SEEDLING_MOISTURE_THRESHOLDS = {
    "rice": 55.0,       # Higher than normal 50 — seedlings need consistent water
    "wheat": 35.0,      # Higher than normal 30
    "maize": 30.0,      # Higher than normal 25
    "cotton": 30.0,     # Higher than normal 25
    "groundnut": 30.0,  # Higher than normal 25
    "sorghum": 25.0,    # Higher than normal 20
}

def _why(category: str, icon: str, severity: str, title: str, detail: str = "") -> dict:
    """Build a structured why-list item."""
    return {"category": category, "icon": icon, "severity": severity, "title": title, "detail": detail}

def generate_recommendation_logic(snapshot: schemas.FieldSnapshotV1, lstm_forecast: Optional[List[float]] = None, ai_history: Optional[List[float]] = None) -> schemas.RecommendationResponse:
    why_list = []
    data_completeness = 0.6
    risk_alert = None
    
    # 1. Calculate data completeness score (how much data we have)
    if snapshot.sensor_readings:
        data_completeness += 0.1
    else:
        data_completeness -= 0.2
        why_list.append(_why("info", "sensors_off", "warning", "Missing Sensor Data", "No soil sensor readings available — recommendations may be less accurate."))
        
    if snapshot.weather:
        data_completeness += 0.1
    else:
        why_list.append(_why("weather", "cloud_off", "warning", "Missing Weather Data", "No weather data from the past 24 hours."))
        
    if snapshot.images:
        data_completeness += 0.1

    # Clamp and round
    data_completeness = round(max(0.0, min(1.0, data_completeness)), 2)

    crop = _normalize_crop(snapshot.crop)
    stage = snapshot.growth_stage.lower()

    # --- IMAGE ANALYSIS with Cross-Validation ---
    image_issue = None
    image_treatment = None
    crop_mismatch = False
    img_result = {}

    if snapshot.images:
        from .ml.image_model import analyze_crop_image

        # Analyze the most recent image
        latest_img = snapshot.images[0]

        img_result = analyze_crop_image(
            image_url=latest_img.rgb_url,
            notes=latest_img.notes,
            crop_name=snapshot.crop,
            growth_stage=stage
        )

        # Cross-check 1: Does the image match the field's registered crop?
        detected_crop = img_result.get("detected_crop")
        if detected_crop:
            detected_crop_norm = _normalize_crop(detected_crop)
            if detected_crop_norm != crop and detected_crop_norm != detected_crop.lower():
                # Only flag mismatch if we can confidently normalize the detected crop
                # (i.e., it maps to one of our known crops)
                if detected_crop_norm in _CROP_NAME_MAP.values():
                    crop_mismatch = True
                    risk_alert = f"Image mismatch: Photo appears to be {detected_crop}, but field is registered as {snapshot.crop}."
                    why_list.append(_why("image", "photo_camera", "danger", "Crop Mismatch", f"Photo appears to be {detected_crop}, but field is registered as {snapshot.crop}."))
                    # Still report what was found, but flag it
                    if img_result["detected_issue"]:
                        why_list.append(_why("image", "photo_camera", "warning", f"Issue on {detected_crop}", f"Visual AI detected: {img_result['detected_issue']}"))
                    data_completeness = round(max(0.0, data_completeness - 0.1), 2)

        if not crop_mismatch:
            if img_result["detected_issue"]:
                image_issue = img_result["detected_issue"]
                image_treatment = img_result.get("treatment")

                sev = "danger" if img_result["severity"] in ("high", "critical") else "warning"
                why_list.append(_why("image", "photo_camera", sev, "Disease/Pest Detected", image_issue))

                if img_result["severity"] == "high" or img_result["severity"] == "critical":
                    risk_alert = f"Visual Alert: {image_issue} detected. Action required."
            elif img_result.get("detected_crop"):
                # AI confirmed it's a plant and found no issues
                why_list.append(_why("image", "photo_camera", "success", "Plant Looks Healthy", "Visual AI found no issues in the uploaded photo."))
            else:
                # AI could not identify any crop/plant in the image
                why_list.append(_why("image", "photo_camera", "info", "Image Unclear", "Could not identify a crop. Upload a clear photo of the plant/leaves."))

    # 2. Irrigation Logic
    irrigation_action = "UNKNOWN"
    irr_liters = 0.0
    irr_timing = "unknown"

    if not snapshot.sensor_readings:
        why_list.append(_why("irrigation", "water_drop", "warning", "Irrigation Data Missing", "Cannot determine irrigation need without soil moisture."))
    else:
        moisture = snapshot.sensor_readings.moisture
        # Seedlings are more sensitive to water stress — use higher threshold
        if stage == "seedling":
            thresh = SEEDLING_MOISTURE_THRESHOLDS.get(crop, 35.0)
        else:
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
            why_list.append(_why("weather", "cloud", "info", "No Forecast Available", "No weather forecast data; assuming 0 rain."))

        if moisture < thresh:
            # --- HYBRID DECISION LOGIC ---
            # 1. Extract Forecasts
            ai_rain_24h = 0.0
            ai_rain_48h = 0.0
            if lstm_forecast and len(lstm_forecast) >= 2:
                ai_rain_24h = float(lstm_forecast[0])
                ai_rain_48h = sum(lstm_forecast[:2])

            # 2. Conflict Detection (Risk Alert)
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
                why_list.append(_why("irrigation", "water_drop", "info", "Rain Expected", f"Rain predicted by {source} — save water, delay irrigation."))
            
            elif storm_approaching:
                irrigation_action = "DELAY"
                irr_timing = "until after storm"
                why_list.append(_why("weather", "thunderstorm", "warning", "Storm Approaching", "Heavy rain predicted in 48 hours — wait before irrigating."))
            
            else:
                # Both agree it's dry
                irrigation_action = "IRRIGATE_NOW"
                irr_liters = IRRIGATION_LITERS.get(crop, 400.0)
                irr_timing = "now"
                why_list.append(_why("irrigation", "water_drop", "success", "Clear Weather", "No rain expected — safe to irrigate now."))

            if risk_alert:
                why_list.append(_why("risk", "warning", "danger", "Weather Uncertainty", risk_alert))
        else:
            irrigation_action = "NO_ACTION"
            why_list.append(_why("irrigation", "water_drop", "success", "Soil Moisture OK", f"Moisture {moisture}% is above the {thresh}% threshold."))

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
        classifier_crop = _CROP_CLASSIFIER_MAP.get(crop, crop.capitalize())
        ai_analysis = classifier.predict(
            n=sr.n,
            p=sr.p,
            k=sr.k,
            ph=sr.ph,
            moisture=sr.moisture,
            crop=classifier_crop
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
                    # Extract nutrient name for the title
                    nutrient = "Nutrient"
                    for n in ("Nitrogen", "Phosphorus", "Potassium", "pH"):
                        if n in deficiency_msg:
                            nutrient = n
                            break
                    why_list.append(_why("fertilizer", "compost", "warning", f"Low {nutrient}", deficiency_msg))
            
            # Add source citation (moved to end for details)
            # Add source citation
            req = adequacy["requirements"]
            sources_str = "; ".join(req["sources"][:1])
            why_list.append(_why("info", "info", "info", "Scientific Source", f"Based on: {sources_str}"))
            
            # ML confidence check
            ml_agrees = False
            if "Low Nitrogen" in ai_analysis and not adequacy["n_adequate"]:
                ml_agrees = True
            if "Low Phosphorus" in ai_analysis and not adequacy["p_adequate"]:
                ml_agrees = True
            if "Low Potassium" in ai_analysis and not adequacy["k_adequate"]:
                ml_agrees = True
            
            if ml_agrees:
                why_list.append(_why("soil", "science", "success", "AI Confirms Deficiency", f"Digital model agrees: {ai_analysis}"))
            else:
                why_list.append(_why("soil", "science", "warning", "AI Suggests Retesting", f"Digital model says '{ai_analysis}' — consider retesting."))
            
            # Calculate fertilizer recommendations
            targets = FERTILIZER_TARGETS.get(crop, FERTILIZER_TARGETS["default"]).get(stage, FERTILIZER_TARGETS["default"]["default"])
            n_rec = targets["n"]
            p_rec = targets["p"]
            k_rec = targets["k"]

            # Seedling-specific fertilizer advice
            if stage == "seedling":
                fert_timing = "apply basal dose at transplanting"
                why_list.append(_why("fertilizer", "compost", "info", "Seedling Fertilizer Advice", "Use starter fertilizer (high-P blend like DAP/10-26-26). Avoid heavy Nitrogen — risk of seedling burn."))
            # Mature/harvest stages — no fertilizer needed
            elif stage in ("mature", "harvest"):
                fert_action = "NO_ACTION"
                n_rec = 0.0
                p_rec = 0.0
                k_rec = 0.0
                fert_timing = "N/A"
                why_list.append(_why("fertilizer", "compost", "success", f"{stage.capitalize()} Stage", f"No fertilizer needed. Focus on {'grain drying' if stage == 'mature' else 'soil recovery'}."))
        else:
            why_list.append(_why("soil", "science", "success", "Soil Healthy", f"Nutrients are adequate for {crop.capitalize()} ({stage} stage)."))
            why_list.append(_why("soil", "science", "info", "AI Soil Analysis", ai_analysis))
            
            # Edge case: ML disagrees with scientific standards
            if "Low" in ai_analysis and not has_deficiency:
                why_list.append(_why("soil", "science", "warning", "Potential Issue Detected", "Digital model found a possible nutrient issue — consider retesting soil."))
                
    else:
        why_list.append(_why("fertilizer", "compost", "warning", "Soil Data Missing", "Cannot determine fertilizer needs without a soil test."))

    # --- CROSS-VALIDATION: Image ↔ Soil Models ---
    if image_issue and snapshot.sensor_readings and not crop_mismatch and ai_analysis != "ML Model Unavailable":
        issue_lower = image_issue.lower()
        # Image sees nutrient deficiency → check if soil agrees
        if "nitrogen" in issue_lower or "deficiency" in issue_lower:
            if "Low Nitrogen" in ai_analysis:
                why_list.append(_why("soil", "science", "success", "Cross-Check Confirmed", "Soil data confirms the nutrient deficiency seen in the photo."))
            else:
                why_list.append(_why("soil", "science", "warning", "Cross-Check Mismatch", "Soil data does NOT confirm the deficiency seen in the photo — consider retesting."))

        # Soil says healthy but image sees disease → trust image for diseases
        if ai_analysis == "Healthy" and image_issue:
            why_list.append(_why("image", "photo_camera", "warning", "Disease Detected (Not Soil)", "Soil is healthy but image shows a disease/pest — this is separate from soil nutrients."))

    # --- SEEDLING-SPECIFIC RISK ALERTS ---
    if stage == "seedling" and snapshot.weather:
        temp = snapshot.weather.temp_c
        if temp is not None:
            if temp < 10:
                risk_alert = risk_alert or f"Cold stress alert: {temp:.0f}°C — seedlings are highly vulnerable to frost/cold."
                why_list.append(_why("risk", "warning", "danger", "Cold Stress Alert", f"Temperature {temp:.0f}°C — seedlings are vulnerable. Protect with mulch or row covers."))
            elif temp > 38:
                risk_alert = risk_alert or f"Heat stress alert: {temp:.0f}°C — seedlings may wilt or die."
                why_list.append(_why("risk", "warning", "danger", "Heat Stress Alert", f"Temperature {temp:.0f}°C — seedlings may wilt. Use shade cloth or irrigate to cool soil."))

    # Append Image Treatment if exists
    if image_treatment and not crop_mismatch:
        why_list.append(_why("image", "photo_camera", "info", "Treatment Recommendation", image_treatment))
    elif crop_mismatch and image_treatment:
        why_list.append(_why("image", "photo_camera", "warning", f"Treatment for {img_result.get('detected_crop', 'detected crop')}", f"{image_treatment} (verify crop first)"))

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
        ai_analysis=image_issue if image_issue else ai_analysis, # Prioritize image issue in summary if found 
        ai_forecast=lstm_forecast, # Pass the raw forecast data [day1, day2, day3]
        ai_history=ai_history, # Pass historical rainfall (last 7 days)
        risk_alert=risk_alert, # Pass hybrid logic alert
        snapshot_used=snapshot
    )
