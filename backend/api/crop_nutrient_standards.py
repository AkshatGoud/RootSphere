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
        "seedling": {
            "n_min": 150,   # Much lower N — seedlings burn easily
            "p_min": 15,    # Higher P for root establishment
            "k_min": 80,    # Lower K need
            "ph_range": (5.5, 6.5),  # Tighter pH tolerance for nursery
            "moisture_min": 50,  # Rice seedlings need standing water
            "description": "Rice (Seedling/Transplanting) - Focus on root establishment",
            "sources": ["TNAU Nursery Management Guide", "ICAR Rice Production Manual"]
        },
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
        },
        "fruiting": {
            "n_min": 150,   # Reduce N to prevent lodging
            "p_min": 18,    # High P for grain fill
            "k_min": 160,   # High K for grain quality
            "ph_range": (5.5, 7.0),
            "moisture_min": 40,
            "description": "Rice (Grain Filling) - High K for grain quality, reduce N",
            "sources": ["TNAU Agritech Portal", "ICAR Rice Production Manual"]
        },
        "mature": {
            "n_min": 100,   # Minimal N — crop is senescing
            "p_min": 8,
            "k_min": 80,
            "ph_range": (5.5, 7.5),
            "moisture_min": 20,  # Reduce water for grain drying
            "description": "Rice (Maturity) - Drain fields, allow grain to dry",
            "sources": ["TNAU Post-Harvest Guide", "ICAR Rice Production Manual"]
        },
        "harvest": {
            "n_min": 80,    # No fertilizer needed
            "p_min": 5,
            "k_min": 60,
            "ph_range": (5.0, 8.0),
            "moisture_min": 10,
            "description": "Rice (Harvest) - No fertilizer, stop irrigation, focus on soil recovery",
            "sources": ["ICAR Post-Harvest Management Guidelines"]
        }
    },
    "wheat": {
        "seedling": {
            "n_min": 150,   # Lower N for young plants
            "p_min": 12,    # Higher P for root development
            "k_min": 80,    # Lower K need
            "ph_range": (6.0, 7.0),  # Tighter tolerance
            "moisture_min": 30,
            "description": "Wheat (Seedling) - Focus on root establishment and tillering",
            "sources": ["TNAU Wheat Production Guide", "ICAR Wheat Manual"]
        },
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
        },
        "fruiting": {
            "n_min": 150,
            "p_min": 15,
            "k_min": 140,
            "ph_range": (6.0, 7.5),
            "moisture_min": 25,
            "description": "Wheat (Grain Filling) - High K for grain quality",
            "sources": ["IIWBR Guidelines", "ICAR Wheat Manual"]
        },
        "mature": {
            "n_min": 100,
            "p_min": 8,
            "k_min": 80,
            "ph_range": (5.5, 8.0),
            "moisture_min": 15,
            "description": "Wheat (Maturity) - Minimal inputs, allow grain to dry",
            "sources": ["ICAR Post-Harvest Guide"]
        },
        "harvest": {
            "n_min": 80,
            "p_min": 5,
            "k_min": 60,
            "ph_range": (5.0, 8.0),
            "moisture_min": 10,
            "description": "Wheat (Harvest) - No fertilizer, stop irrigation",
            "sources": ["ICAR Post-Harvest Management Guidelines"]
        }
    },
    "maize": {
        "seedling": {
            "n_min": 160,   # Much lower than veg (300) — seedlings burn easily
            "p_min": 15,    # Higher P for root establishment
            "k_min": 80,    # Lower K need
            "ph_range": (5.8, 7.0),
            "moisture_min": 30,
            "description": "Maize (Seedling) - Focus on root establishment, avoid N burn",
            "sources": ["TNAU Maize Production Guide", "FAO Fertilizer Guidelines"]
        },
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
        },
        "fruiting": {
            "n_min": 200,
            "p_min": 18,
            "k_min": 160,
            "ph_range": (5.5, 7.5),
            "moisture_min": 30,
            "description": "Maize (Grain Filling) - High K for cob development",
            "sources": ["FAO Fertilizer Guidelines", "TNAU Agritech"]
        },
        "mature": {
            "n_min": 120,
            "p_min": 8,
            "k_min": 80,
            "ph_range": (5.5, 8.0),
            "moisture_min": 15,
            "description": "Maize (Maturity) - Minimal inputs, grain drying",
            "sources": ["ICAR Post-Harvest Guide"]
        },
        "harvest": {
            "n_min": 80,
            "p_min": 5,
            "k_min": 60,
            "ph_range": (5.0, 8.0),
            "moisture_min": 10,
            "description": "Maize (Harvest) - No fertilizer, stop irrigation",
            "sources": ["ICAR Post-Harvest Management Guidelines"]
        }
    },
    "cotton": {
        "seedling": {
            "n_min": 130,   # Lower N to avoid burn
            "p_min": 14,    # Higher P for root development
            "k_min": 80,    # Lower K need
            "ph_range": (6.0, 7.0),
            "moisture_min": 30,
            "description": "Cotton (Seedling) - Focus on root establishment, avoid damping-off",
            "sources": ["TNAU Cotton Production Guide", "CICR Nagpur Guidelines"]
        },
        "vegetative": {
            "n_min": 250,
            "p_min": 11,
            "k_min": 110,
            "ph_range": (6.0, 7.5),
            "moisture_min": 25,
            "description": "Cotton (Vegetative Stage) - Moderate N, sensitive to pH",
            "sources": [
                "TNAU: 80 kg N, 40 kg P₂O₅, 40 kg K₂O/ha (rainfed)",
                "ICAR: 120 kg N, 60 kg P₂O₅, 60 kg K₂O/ha (irrigated)"
            ]
        },
        "flowering": {
            "n_min": 200,
            "p_min": 15,
            "k_min": 130,
            "ph_range": (6.0, 7.5),
            "moisture_min": 30,
            "description": "Cotton (Flowering/Boll Development) - Increased K for fiber",
            "sources": ["TNAU Crop Production Guide", "CICR Nagpur Guidelines"]
        },
        "fruiting": {
            "n_min": 180,
            "p_min": 15,
            "k_min": 150,   # High K for boll/fiber development
            "ph_range": (6.0, 7.5),
            "moisture_min": 25,
            "description": "Cotton (Boll Development) - High K for fiber quality",
            "sources": ["CICR Nagpur Guidelines", "TNAU Agritech"]
        },
        "mature": {
            "n_min": 100,
            "p_min": 8,
            "k_min": 80,
            "ph_range": (5.5, 8.0),
            "moisture_min": 15,
            "description": "Cotton (Maturity) - Reduce inputs, boll opening",
            "sources": ["CICR Post-Harvest Guide"]
        },
        "harvest": {
            "n_min": 80,
            "p_min": 5,
            "k_min": 60,
            "ph_range": (5.0, 8.0),
            "moisture_min": 10,
            "description": "Cotton (Harvest) - No fertilizer, focus on picking",
            "sources": ["ICAR Post-Harvest Management Guidelines"]
        }
    },
    "groundnut": {
        "seedling": {
            "n_min": 100,   # Legume — low N, focus on Rhizobium establishment
            "p_min": 18,    # Higher P for root nodule formation
            "k_min": 70,    # Lower K
            "ph_range": (5.8, 6.5),
            "moisture_min": 30,
            "description": "Groundnut (Seedling) - Root/nodule establishment, Rhizobium inoculation",
            "sources": ["TNAU Groundnut Guide", "ICAR Groundnut Production Manual"]
        },
        "vegetative": {
            "n_min": 200,  # Legume - fixes own N, lower requirement
            "p_min": 15,
            "k_min": 100,
            "ph_range": (5.5, 7.0),
            "moisture_min": 25,
            "description": "Groundnut (Vegetative Stage) - Low N (legume), moderate P/K",
            "sources": [
                "TNAU: 25 kg N, 50 kg P₂O₅, 75 kg K₂O/ha",
                "ICAR: Seed inoculation with Rhizobium recommended"
            ]
        },
        "flowering": {
            "n_min": 150,
            "p_min": 20,
            "k_min": 120,
            "ph_range": (5.5, 7.0),
            "moisture_min": 30,
            "description": "Groundnut (Pegging/Pod Formation) - High Ca/P for pod fill",
            "sources": ["TNAU Agritech Portal", "ICAR Groundnut Production Guide"]
        },
        "fruiting": {
            "n_min": 120,
            "p_min": 22,    # Very high P for pod development
            "k_min": 130,
            "ph_range": (5.5, 7.0),
            "moisture_min": 25,
            "description": "Groundnut (Pod Development) - High P/Ca for pod fill",
            "sources": ["TNAU Agritech Portal", "ICAR Groundnut Production Guide"]
        },
        "mature": {
            "n_min": 80,
            "p_min": 8,
            "k_min": 70,
            "ph_range": (5.5, 7.5),
            "moisture_min": 15,
            "description": "Groundnut (Maturity) - Reduce irrigation for pod drying",
            "sources": ["ICAR Post-Harvest Guide"]
        },
        "harvest": {
            "n_min": 60,
            "p_min": 5,
            "k_min": 50,
            "ph_range": (5.0, 8.0),
            "moisture_min": 10,
            "description": "Groundnut (Harvest) - No fertilizer, stop irrigation",
            "sources": ["ICAR Post-Harvest Management Guidelines"]
        }
    },
    "sorghum": {
        "seedling": {
            "n_min": 140,   # Lower N for seedlings
            "p_min": 12,    # Higher P for root establishment
            "k_min": 70,    # Lower K need
            "ph_range": (5.8, 7.0),
            "moisture_min": 25,  # Still drought tolerant
            "description": "Sorghum (Seedling) - Root establishment, protect from shoot fly",
            "sources": ["TNAU Sorghum Guide", "ICAR Sorghum Production Manual"]
        },
        "vegetative": {
            "n_min": 260,
            "p_min": 10,
            "k_min": 110,
            "ph_range": (5.5, 7.5),
            "moisture_min": 20,  # Drought tolerant
            "description": "Sorghum (Vegetative Stage) - Moderate N, drought tolerant",
            "sources": [
                "TNAU: 80 kg N, 40 kg P₂O₅/ha",
                "ICAR: 100 kg N, 50 kg P₂O₅, 25 kg K₂O/ha (hybrid)"
            ]
        },
        "flowering": {
            "n_min": 200,
            "p_min": 12,
            "k_min": 120,
            "ph_range": (5.5, 7.5),
            "moisture_min": 25,
            "description": "Sorghum (Flowering/Grain Filling)",
            "sources": ["NRCS Sorghum Guidelines", "TNAU Agritech"]
        },
        "fruiting": {
            "n_min": 160,
            "p_min": 14,
            "k_min": 130,
            "ph_range": (5.5, 7.5),
            "moisture_min": 20,
            "description": "Sorghum (Grain Filling) - Moderate K for grain quality",
            "sources": ["NRCS Sorghum Guidelines", "TNAU Agritech"]
        },
        "mature": {
            "n_min": 100,
            "p_min": 8,
            "k_min": 70,
            "ph_range": (5.5, 8.0),
            "moisture_min": 10,
            "description": "Sorghum (Maturity) - Minimal inputs, grain drying",
            "sources": ["ICAR Post-Harvest Guide"]
        },
        "harvest": {
            "n_min": 80,
            "p_min": 5,
            "k_min": 50,
            "ph_range": (5.0, 8.0),
            "moisture_min": 10,
            "description": "Sorghum (Harvest) - No fertilizer, stop irrigation",
            "sources": ["ICAR Post-Harvest Management Guidelines"]
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
