"""
Crop-Specific Nutrient Requirements for Indian Agriculture
Source: ICAR (Indian Council of Agricultural Research) & TNAU (Tamil Nadu Agricultural University)

All values in kg/ha unless specified otherwise.
Note: These are AVAILABLE nutrient levels in soil, not fertilizer application rates.
"""

# Soil nutrient availability thresholds (kg/ha)
# Based on Soil Health Card interpretations and ICAR guidelines

CROP_NUTRIENT_REQUIREMENTS = {
    "rice": {
        "vegetative": {
            "n_min": 280,  # Low: <280, Medium: 280-560, High: >560 kg/ha (Source: ICAR Soil Health Manual)
            "p_min": 10,   # Low: <10, Medium: 10-25, High: >25 kg/ha
            "k_min": 120,  # Low: <120, Medium: 120-280, High: >280 kg/ha
            "ph_range": (5.5, 7.0),  # Optimal pH for rice
            "moisture_min": 40,  # Rice requires high moisture (flooded conditions)
            "description": "Rice (Vegetative Stage) - High N, moderate P/K requirements",
            "sources": [
                "TNAU Crop Production Guide: 150 kg N, 50 kg P₂O₅, 50 kg K₂O/ha",
                "ICAR Soil Health Card Manual - Nutrient Ranges"
            ]
        },
        "flowering": {
            "n_min": 200,  # Lower N during flowering to prevent lodging
            "p_min": 15,   # Increased P for grain development
            "k_min": 140,  # Increased K for grain filling
            "ph_range": (5.5, 7.0),
            "moisture_min": 50,
            "description": "Rice (Flowering/Grain Filling) - Moderate N, increased P/K",
            "sources": ["TNAU Agritech Portal", "NFSM Guidelines"]
        }
    },
    "wheat": {
        "vegetative": {
            "n_min": 280,  # Similar to rice
            "p_min": 10,
            "k_min": 110,  # Slightly lower than rice
            "ph_range": (6.0, 7.5),  # Wheat prefers slightly alkaline
            "moisture_min": 25,  # Wheat needs less moisture than rice
            "description": "Wheat (Vegetative Stage) - Moderate to high N requirement",
            "sources": [
                "TNAU: 80 kg N, 40 kg P₂O₅, 40 kg K₂O/ha (rainfed)",
                "ICAR RDF: 150 kg N, 60 kg P₂O₅, 40 kg K₂O/ha (irrigated)",
                "HP Agriculture Dept: 120 kg N, 60 kg P₂O₅, 30 kg K/ha"
            ]
        },
        "flowering": {
            "n_min": 200,
            "p_min": 12,
            "k_min": 120,
            "ph_range": (6.0, 7.5),
            "moisture_min": 30,
            "description": "Wheat (Flowering/Grain Development)",
            "sources": ["IIWBR Late-Sown Guidelines"]
        }
    },
    "maize": {
        "vegetative": {
            "n_min": 300,  # Maize is a heavy feeder
            "p_min": 12,
            "k_min": 120,
            "ph_range": (5.5, 7.5),  # Tolerates wider range
            "moisture_min": 30,
            "description": "Maize (Vegetative Stage) - Very high N requirement",
            "sources": [
                "TNAU: 135 kg N, 62.5 kg P₂O₅, 50 kg K₂O/ha (varieties)",
                "TNAU: 250 kg N, 75 kg P₂O₅, 75 kg K₂O/ha (hybrids)",
                "FAO: 90-150 kg N/ha for late-maturing varieties"
            ]
        },
        "flowering": {
            "n_min": 250,
            "p_min": 15,
            "k_min": 140,
            "ph_range": (5.5, 7.5),
            "moisture_min": 35,
            "description": "Maize (Flowering/Grain Filling) - High N/K for yield",
            "sources": ["FAO Fertilizer Guidelines", "TNAU Agritech"]
        }
    }
}

# Default fallback for unlisted crops
DEFAULT_REQUIREMENTS = {
    "default": {
        "n_min": 280,
        "p_min": 10,
        "k_min": 120,
        "ph_range": (6.0, 7.5),
        "moisture_min": 30,
        "description": "General crop requirements (based on medium fertility needs)",
        "sources": ["ICAR General Guidelines"]
    }
}

def get_crop_requirements(crop: str, growth_stage: str = "vegetative") -> dict:
    """
    Get nutrient requirements for a specific crop and growth stage.
    
    Args:
        crop: Crop name (rice, wheat, maize)
        growth_stage: Growth stage (vegetative, flowering, default)
    
    Returns:
        Dictionary with n_min, p_min, k_min, ph_range, moisture_min, description, sources
    """
    crop = crop.lower()
    stage = growth_stage.lower()
    
    if crop in CROP_NUTRIENT_REQUIREMENTS:
        if stage in CROP_NUTRIENT_REQUIREMENTS[crop]:
            return CROP_NUTRIENT_REQUIREMENTS[crop][stage]
        else:
            # Fallback to vegetative if stage not found
            return CROP_NUTRIENT_REQUIREMENTS[crop].get("vegetative", DEFAULT_REQUIREMENTS["default"])
    else:
        # Unknown crop, use default
        return DEFAULT_REQUIREMENTS["default"]

def check_nutrient_adequacy(crop: str, growth_stage: str, n: float, p: float, k: float, ph: float, moisture: float) -> dict:
    """
    Check if soil nutrients are adequate for the crop/stage.
    
    Returns:
        {
            "n_adequate": bool,
            "p_adequate": bool,
            "k_adequate": bool,
            "ph_adequate": bool,
            "moisture_adequate": bool,
            "deficiencies": list of str,
            "requirements": dict (the thresholds used)
        }
    """
    req = get_crop_requirements(crop, growth_stage)
    
    n_adequate = n >= req["n_min"]
    p_adequate = p >= req["p_min"]
    k_adequate = k >= req["k_min"]
    ph_adequate = req["ph_range"][0] <= ph <= req["ph_range"][1]
    moisture_adequate = moisture >= req["moisture_min"]
    
    deficiencies = []
    if not n_adequate:
        deficiencies.append(f"Nitrogen is low ({n:.0f} vs {req['n_min']} kg/ha)")
    if not p_adequate:
        deficiencies.append(f"Phosphorus is low ({p:.0f} vs {req['p_min']} kg/ha)")
    if not k_adequate:
        deficiencies.append(f"Potassium is low ({k:.0f} vs {req['k_min']} kg/ha)")
    if not ph_adequate:
        if ph < req["ph_range"][0]:
            deficiencies.append(f"Soil is too acidic (pH {ph:.1f})")
        else:
            deficiencies.append(f"Soil is too alkaline (pH {ph:.1f})")
    if not moisture_adequate:
        deficiencies.append(f"Soil moisture is low ({moisture:.0f}%)")
    
    return {
        "n_adequate": n_adequate,
        "p_adequate": p_adequate,
        "k_adequate": k_adequate,
        "ph_adequate": ph_adequate,
        "moisture_adequate": moisture_adequate,
        "deficiencies": deficiencies,
        "requirements": req
    }
