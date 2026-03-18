import logging
import os
import random
import json
from io import BytesIO

logger = logging.getLogger("api")

"""
TNAU/ICAR OFFICIAL CROP DISEASE DICTIONARY
Used as treatment lookup for HuggingFace model detections and as fallback for keyword-based analysis.
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

# Map HuggingFace model class labels to severity and treatment lookup keywords
DISEASE_SEVERITY = {
    "healthy": "none",
    "scab": "medium",
    "rot": "high",
    "rust": "high",
    "blight": "high",
    "spot": "medium",
    "mold": "medium",
    "virus": "critical",
    "wilt": "high",
    "curl": "high",
    "mildew": "medium",
    "blast": "high",
    "canker": "high",
    "leaf": "medium",
}

# Gemini system prompt for agricultural pathology
_GEMINI_SYSTEM_PROMPT = """\
You are an expert agricultural pathologist trained on ICAR and TNAU crop disease databases.
Analyze this crop image and:
1. Identify what crop/plant is actually visible in the image
2. Detect any disease/pest/deficiency (or "healthy" if none found)
3. Confidence (0.0-1.0)
4. Severity (none/low/medium/high/critical)
5. Specific treatment recommendation using Indian agricultural standards (TNAU/ICAR)

Consider: leaf shape, plant structure, leaf color, spots, wilting, pest damage, fungal growth, nutrient deficiency symptoms.
If the image is not a crop/plant image (e.g. random object, person, landscape without crops), set detected_crop to null and detected_issue to null.

Respond ONLY with valid JSON (no markdown, no code fences):
{"detected_crop": "string — the crop/plant you see in the image, or null if not identifiable", "detected_issue": "string or null if healthy", "confidence": 0.0, "severity": "none", "treatment": "string or null if healthy"}
"""

# Singleton for HuggingFace pipeline (lazy loaded)
_hf_pipeline = None
_hf_load_attempted = False

# Singleton for OpenAI client (lazy loaded)
_openai_client = None
_openai_load_attempted = False

# Singleton for Groq client (lazy loaded)
_groq_client = None
_groq_load_attempted = False

# Singleton for Gemini client (lazy loaded)
_gemini_client = None
_gemini_load_attempted = False


def _get_gemini_client():
    """Lazy-load the Gemini API client."""
    global _gemini_client, _gemini_load_attempted
    if _gemini_load_attempted:
        return _gemini_client
    _gemini_load_attempted = True

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        logger.info("GEMINI_API_KEY not set, Gemini vision disabled.")
        return None

    try:
        from google import genai
        _gemini_client = genai.Client(api_key=api_key)
        logger.info("Gemini API client initialized successfully.")
    except Exception as e:
        logger.warning(f"Failed to initialize Gemini client: {e}")
        _gemini_client = None
    return _gemini_client


def _get_hf_pipeline():
    """Lazy-load the HuggingFace image classification pipeline."""
    global _hf_pipeline, _hf_load_attempted
    if _hf_load_attempted:
        return _hf_pipeline
    _hf_load_attempted = True
    try:
        from transformers import pipeline
        logger.info("Loading HuggingFace plant disease model...")
        _hf_pipeline = pipeline(
            "image-classification",
            model="Diginsa/Plant-Disease-Detection-Project",
            top_k=5,
        )
        logger.info("HuggingFace plant disease model loaded successfully.")
    except Exception as e:
        logger.warning(f"Failed to load HuggingFace model, will use keyword fallback: {e}")
        _hf_pipeline = None
    return _hf_pipeline


def _download_image(image_url: str):
    """Download image from URL, base64 data URL, or local uploads and return a PIL Image."""
    from PIL import Image

    # Handle base64 data URLs (e.g. data:image/jpeg;base64,...)
    if image_url.startswith("data:"):
        import base64
        # Strip "data:image/jpeg;base64," prefix
        b64_data = image_url.split(",", 1)[1]
        return Image.open(BytesIO(base64.b64decode(b64_data))).convert("RGB")

    # Handle locally uploaded files
    if image_url.startswith("/uploads/"):
        local_path = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", os.path.basename(image_url))
        return Image.open(local_path).convert("RGB")

    import requests
    response = requests.get(image_url, timeout=15)
    response.raise_for_status()
    return Image.open(BytesIO(response.content)).convert("RGB")


def _classify_severity(label: str) -> str:
    """Determine severity from a model label string."""
    label_lower = label.lower()
    if "healthy" in label_lower:
        return "none"
    for keyword, severity in DISEASE_SEVERITY.items():
        if keyword in label_lower:
            return severity
    return "medium"  # default for unknown diseases


def _find_treatment(issue: str, crop_key: str) -> str:
    """Look up treatment from CROP_ALERTS based on detected issue keywords."""
    issue_lower = issue.lower()
    knowledge_base = CROP_ALERTS.get(crop_key, {})

    # Search crop-specific alerts
    for keyword, data in knowledge_base.items():
        if keyword in issue_lower:
            return data["treatment"]

    # Search generic alerts
    for keyword, data in GENERIC_ALERTS.items():
        if keyword in issue_lower:
            return data["treatment"]

    return "Consult Agronomist for specific treatment."


def _normalize_crop_key(crop_name: str) -> str:
    """Normalize crop name to dictionary key."""
    name = crop_name.lower()
    if "cotton" in name:
        return "cotton"
    if "groundnut" in name or "peanut" in name:
        return "groundnut"
    if "cholam" in name or "sorghum" in name:
        return "cholam"
    return "paddy"


def _keyword_fallback(image_url: str, notes: str, crop_name: str) -> dict:
    """Original keyword-based analysis as fallback."""
    text_cues = (notes + " " + image_url).lower()
    crop_key = _normalize_crop_key(crop_name)
    knowledge_base = CROP_ALERTS.get(crop_key, GENERIC_ALERTS)

    detected = None
    for keyword, data in knowledge_base.items():
        if keyword in text_cues:
            detected = data
            break

    if not detected and crop_key != "generic":
        for keyword, data in GENERIC_ALERTS.items():
            if keyword in text_cues:
                detected = data
                break

    if detected:
        return {
            "detected_crop": None,
            "detected_issue": detected["issue"],
            "treatment": detected["treatment"],
            "confidence": 0.85 + (0.10 * random.random()),
            "severity": detected["severity"]
        }

    return {
        "detected_crop": None,
        "detected_issue": None,
        "treatment": None,
        "confidence": 0.95,
        "severity": "none"
    }


def _analyze_with_gemini(image, crop_name: str) -> dict | None:
    """Analyze crop image using Gemini Vision API. Returns dict or None on failure."""
    client = _get_gemini_client()
    if client is None:
        return None

    try:
        from google.genai import types

        # Convert PIL Image to bytes for Gemini API
        img_buffer = BytesIO()
        image.save(img_buffer, format="JPEG")
        img_bytes = img_buffer.getvalue()

        user_prompt = f"The farmer says this is: {crop_name}. First identify what crop/plant is actually in this image, then analyze for diseases, pests, or nutrient deficiencies."

        image_part = types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg")
        text_part = types.Part(text=user_prompt)

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[
                types.Content(
                    role="user",
                    parts=[image_part, text_part],
                ),
            ],
            config=types.GenerateContentConfig(
                system_instruction=_GEMINI_SYSTEM_PROMPT,
                temperature=0.2,
                max_output_tokens=512,
            ),
        )

        raw_text = response.text.strip()
        # Strip markdown code fences if present
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[-1]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3].strip()

        result = json.loads(raw_text)

        # Validate and normalize the response
        detected_crop = result.get("detected_crop")
        detected = result.get("detected_issue")
        confidence = float(result.get("confidence", 0.5))
        severity = result.get("severity", "medium")
        treatment = result.get("treatment")

        # Clamp confidence
        confidence = max(0.0, min(1.0, confidence))

        # Validate severity
        valid_severities = {"none", "low", "medium", "high", "critical"}
        if severity not in valid_severities:
            severity = "medium"

        # Supplement treatment from CROP_ALERTS if Gemini didn't provide one
        if detected and not treatment:
            crop_key = _normalize_crop_key(crop_name)
            treatment = _find_treatment(detected, crop_key)

        logger.info(f"Gemini analysis: crop={detected_crop}, issue={detected}, confidence={confidence}, severity={severity}")
        return {
            "detected_crop": detected_crop,
            "detected_issue": detected,
            "treatment": treatment,
            "confidence": confidence,
            "severity": severity,
        }

    except Exception as e:
        logger.warning(f"Gemini analysis failed: {e}")
        return None


def _get_openai_client():
    """Lazy-load the OpenAI client."""
    global _openai_client, _openai_load_attempted
    if _openai_load_attempted:
        return _openai_client
    _openai_load_attempted = True

    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        logger.info("OPENAI_API_KEY not set, OpenAI vision disabled.")
        return None

    try:
        from openai import OpenAI
        _openai_client = OpenAI(api_key=api_key)
        logger.info("OpenAI client initialized successfully.")
    except Exception as e:
        logger.warning(f"Failed to initialize OpenAI client: {e}")
        _openai_client = None
    return _openai_client


def _analyze_with_openai(image, crop_name: str) -> dict | None:
    """Analyze crop image using OpenAI GPT-4o-mini. Returns dict or None on failure."""
    client = _get_openai_client()
    if client is None:
        return None

    try:
        import base64

        # Convert PIL Image to base64
        img_buffer = BytesIO()
        image.save(img_buffer, format="JPEG")
        b64_image = base64.b64encode(img_buffer.getvalue()).decode()

        user_prompt = f"The farmer says this is: {crop_name}. First identify what crop/plant is actually in this image, then analyze for diseases, pests, or nutrient deficiencies."

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": _GEMINI_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_image}", "detail": "low"}},
                        {"type": "text", "text": user_prompt},
                    ],
                },
            ],
            temperature=0.2,
            max_tokens=512,
        )

        raw_text = response.choices[0].message.content.strip()
        # Strip markdown code fences if present
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[-1]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3].strip()

        result = json.loads(raw_text)

        detected_crop = result.get("detected_crop")
        detected = result.get("detected_issue")
        confidence = max(0.0, min(1.0, float(result.get("confidence", 0.5))))
        severity = result.get("severity", "medium")
        treatment = result.get("treatment")

        valid_severities = {"none", "low", "medium", "high", "critical"}
        if severity not in valid_severities:
            severity = "medium"

        if detected and not treatment:
            crop_key = _normalize_crop_key(crop_name)
            treatment = _find_treatment(detected, crop_key)

        logger.info(f"OpenAI analysis: crop={detected_crop}, issue={detected}, confidence={confidence}, severity={severity}")
        return {
            "detected_crop": detected_crop,
            "detected_issue": detected,
            "treatment": treatment,
            "confidence": confidence,
            "severity": severity,
        }

    except Exception as e:
        logger.warning(f"OpenAI analysis failed: {e}")
        return None


def _get_groq_client():
    """Lazy-load the Groq client (uses OpenAI-compatible API)."""
    global _groq_client, _groq_load_attempted
    if _groq_load_attempted:
        return _groq_client
    _groq_load_attempted = True

    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if not api_key:
        logger.info("GROQ_API_KEY not set, Groq vision disabled.")
        return None

    try:
        from openai import OpenAI
        _groq_client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
        logger.info("Groq client initialized successfully.")
    except Exception as e:
        logger.warning(f"Failed to initialize Groq client: {e}")
        _groq_client = None
    return _groq_client


def _analyze_with_groq(image, crop_name: str) -> dict | None:
    """Analyze crop image using Groq (Llama 4 Scout vision). Returns dict or None on failure."""
    client = _get_groq_client()
    if client is None:
        return None

    try:
        import base64

        # Convert PIL Image to base64
        img_buffer = BytesIO()
        image.save(img_buffer, format="JPEG")
        b64_image = base64.b64encode(img_buffer.getvalue()).decode()

        user_prompt = f"The farmer says this is: {crop_name}. First identify what crop/plant is actually in this image, then analyze for diseases, pests, or nutrient deficiencies."

        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {"role": "system", "content": _GEMINI_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_image}"}},
                        {"type": "text", "text": user_prompt},
                    ],
                },
            ],
            temperature=0.2,
            max_tokens=512,
        )

        raw_text = response.choices[0].message.content.strip()
        # Strip markdown code fences if present
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[-1]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3].strip()

        result = json.loads(raw_text)

        detected_crop = result.get("detected_crop")
        detected = result.get("detected_issue")
        confidence = max(0.0, min(1.0, float(result.get("confidence", 0.5))))
        severity = result.get("severity", "medium")
        treatment = result.get("treatment")

        valid_severities = {"none", "low", "medium", "high", "critical"}
        if severity not in valid_severities:
            severity = "medium"

        if detected and not treatment:
            crop_key = _normalize_crop_key(crop_name)
            treatment = _find_treatment(detected, crop_key)

        logger.info(f"Groq analysis: crop={detected_crop}, issue={detected}, confidence={confidence}, severity={severity}")
        return {
            "detected_crop": detected_crop,
            "detected_issue": detected,
            "treatment": treatment,
            "confidence": confidence,
            "severity": severity,
        }

    except Exception as e:
        logger.warning(f"Groq analysis failed: {e}")
        return None


def _analyze_with_huggingface(image, crop_name: str) -> dict | None:
    """Analyze crop image using HuggingFace model. Returns dict or None on failure."""
    pipe = _get_hf_pipeline()
    if pipe is None:
        return None

    try:
        crop_key = _normalize_crop_key(crop_name)
        results = pipe(image)
        if not results:
            return None

        top = results[0]
        label = top["label"]
        confidence = float(top["score"])

        # Low confidence means the model can't identify the image (likely not a plant)
        if confidence < 0.5:
            logger.info(f"HuggingFace confidence too low ({confidence:.2f}), treating as unidentifiable")
            return {
                "detected_crop": None,
                "detected_issue": None,
                "treatment": None,
                "confidence": confidence,
                "severity": "none"
            }

        parts = label.replace("___", " - ").replace("_", " ")

        # HF model labels are like "Tomato___Bacterial_spot" — extract crop name
        hf_crop = label.split("___")[0].replace("_", " ") if "___" in label else None

        if "healthy" in label.lower():
            return {
                "detected_crop": hf_crop,
                "detected_issue": None,
                "treatment": None,
                "confidence": confidence,
                "severity": "none"
            }

        severity = _classify_severity(label)
        treatment = _find_treatment(parts, crop_key)

        logger.info(f"HuggingFace analysis: crop={hf_crop}, issue={parts}, confidence={confidence}, severity={severity}")
        return {
            "detected_crop": hf_crop,
            "detected_issue": parts,
            "treatment": treatment,
            "confidence": confidence,
            "severity": severity
        }

    except Exception as e:
        logger.warning(f"HuggingFace inference failed: {e}")
        return None


def analyze_crop_image(image_url: str, notes: str = "", crop_name: str = "paddy") -> dict:
    """
    Analyze a crop image for disease detection.

    Fallback chain: Gemini Vision API → HuggingFace model → keyword matching.

    Args:
        image_url: URL of input image
        notes: User notes about the image
        crop_name: The specific crop type (e.g. 'Paddy (Rice)', 'Cotton')

    Returns:
        dict: {detected_issue, treatment, confidence, severity}
    """
    # Try to download the image (needed by both Gemini and HuggingFace)
    image = None
    try:
        image = _download_image(image_url)
    except Exception as e:
        logger.warning(f"Image download failed ({e}), using keyword fallback.")
        return _keyword_fallback(image_url, notes, crop_name)

    # Level 1: Gemini Vision API (free)
    result = _analyze_with_gemini(image, crop_name)
    if result is not None:
        return result

    # Level 2: Groq - Llama 4 Scout (free)
    result = _analyze_with_groq(image, crop_name)
    if result is not None:
        return result

    # Level 3: OpenAI GPT-4o-mini (paid)
    result = _analyze_with_openai(image, crop_name)
    if result is not None:
        return result

    # Level 4: HuggingFace model (local)
    result = _analyze_with_huggingface(image, crop_name)
    if result is not None:
        return result

    # Level 5: Keyword fallback
    logger.info("All vision models unavailable, using keyword fallback.")
    return _keyword_fallback(image_url, notes, crop_name)


def get_treatment_for_issue(issue: str, crop_name: str = "") -> str:
    """
    Deprecated: Treatment is now returned directly by analyze_crop_image.
    Kept for backward compatibility if needed.
    """
    return "Consult Agronomist"
