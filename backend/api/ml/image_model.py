import random

"""
TNAU/ICAR OFFICIAL CROP DISEASE DICTIONARY
Used for simulating deterministic visual AI results based on crop type and visual cues.
"""
CROP_ALERTS = {
    # --- RICE (PADDY) ---
    "paddy": {
        "yellow": {"issue": "Nitrogen Deficiency", "treatment": "Apply Urea 22kg/acre top dressing.", "severity": "medium"},
        "orange": {"issue": "Tungro Virus", "treatment": "Control Green Leafhopper vector.", "severity": "high"},
        "brown": {"issue": "Brown Spot (Helminthosporium)", "treatment": "Spray Mancozeb 2.0g/lit.", "severity": "high"},
        "spot": {"issue": "Rice Blast (Pyricularia)", "treatment": "Spray Tricyclazole 75% WP.", "severity": "high"},
        "white": {"issue": "Thrips Damage", "treatment": "Spray Phosphamidon 40 SL.", "severity": "low"}
    },
    
    # --- COTTON ---
    "cotton": {
        "curl": {"issue": "Leaf Curl Virus (CLCuV)", "treatment": "Remove infected plants; control Whitefly.", "severity": "critical"},
        "yellow": {"issue": "Magnesium Deficiency", "treatment": "Foliar spray of MgSO4 1% at 20-day intervals.", "severity": "medium"},
        "red": {"issue": "Reddening (Mg Deficiency)", "treatment": "Spray MgSO4 5% + Urea 1%.", "severity": "medium"},
        "wilt": {"issue": "Fusarium Wilt", "treatment": "Drench soil with Copper Oxychloride.", "severity": "high"},
        "bug": {"issue": "Mealybug Infestation", "treatment": "Spray Profenofos 50 EC.", "severity": "high"}
    },
    
    # --- GROUNDNUT (PEANUT) ---
    "groundnut": {
        "spot": {"issue": "Tikka Disease (Leaf Spot)", "treatment": "Spray Carbendazim 250g/ha.", "severity": "high"},
        "yellow": {"issue": "Iron Chlorosis (Fe)", "treatment": "Spray Ferrous Sulphate 0.5% + Citric Acid 0.1%.", "severity": "medium"},
        "rot": {"issue": "Collar Rot", "treatment": "Seed treatment with Trichoderma.", "severity": "high"}
    },
    
    # --- SORGHUM (CHOLAM) ---
    "cholam": {
        "red": {"issue": "Anthracnose", "treatment": "Spray Mancozeb 1kg/ha.", "severity": "medium"},
        "dead": {"issue": "Shoot Fly (Deadheart)", "treatment": "Install fish meal traps.", "severity": "high"},
        "spot": {"issue": "Zonate Leaf Spot", "treatment": "Field sanitation; remove weeds.", "severity": "low"}
    }
}

# Fallback for generic/unknown crops
GENERIC_ALERTS = {
    "yellow": {"issue": "Nutrient Deficiency (General)", "treatment": "Apply balanced NPK fertilizer.", "severity": "medium"},
    "spot": {"issue": "Fungal Leaf Spot", "treatment": "Apply mild fungicide.", "severity": "medium"},
    "wilt": {"issue": "Root Zone Issue", "treatment": "Check drainage and soil moisture.", "severity": "high"}
}

def analyze_crop_image(image_url: str, notes: str = "", crop_name: str = "paddy") -> dict:
    """
    Simulates a specialized Deep Learning model trained on TNAU crop datasets.
    
    Args:
        image_url (str): URL of input image
        notes (str): User notes (simulates visual features)
        crop_name (str): The specific crop type (e.g. 'Paddy (Rice)', 'Cotton')
        
    Returns:
        dict: {detected_issue, confidence, severity, treatment_hint}
    """
    
    # Normalize inputs
    text_cues = (notes + " " + image_url).lower()
    
    # Normalize crop name to key
    crop_key = "paddy" # Default
    if "cotton" in crop_name.lower(): crop_key = "cotton"
    elif "groundnut" in crop_name.lower() or "peanut" in crop_name.lower(): crop_key = "groundnut"
    elif "cholam" in crop_name.lower() or "sorghum" in crop_name.lower(): crop_key = "cholam"
    
    # Select dictionary
    knowledge_base = CROP_ALERTS.get(crop_key, GENERIC_ALERTS)
    
    # Search for cues
    detected = None
    
    # Priority search
    for keyword, data in knowledge_base.items():
        if keyword in text_cues:
            detected = data
            break
            
    # Fallback to generic if crop-specific search failed but visual cues exist
    if not detected and crop_key != "generic":
        for keyword, data in GENERIC_ALERTS.items():
            if keyword in text_cues:
                detected = data
                break

    if detected:
        return {
            "detected_issue": detected["issue"],
            "treatment": detected["treatment"], # Pass raw treatment string
            "confidence": 0.85 + (0.10 * random.random()), # High confidence simulation
            "severity": detected["severity"]
        }
    
    return {
        "detected_issue": None,
        "treatment": None,
        "confidence": 0.95,
        "severity": "none"
    }

def get_treatment_for_issue(issue: str, crop_name: str = "") -> str:
    """
    Deprecated: Treatment is now returned directly by analyze_crop_image.
    Kept for backward compatibility if needed.
    """
    return "Consult Agronomist"
