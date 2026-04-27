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

# Additional seedling-specific analysis instructions appended to prompts
_SEEDLING_PROMPT_EXTRA = """
IMPORTANT: This crop is in the SEEDLING stage. Pay special attention to:
- Germination uniformity and seedling vigor
- Damping-off disease symptoms (wilting at soil line, thin/rotting stems)
- Seedling color (pale = nutrient deficiency, yellow = N deficiency)
- Plant spacing issues (overcrowding, gaps)
- Cutworm or bird damage
- Root development quality if visible
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

# --- Local Ollama (Gemma 4) configuration ---
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "gemma4:e2b")
OLLAMA_TIMEOUT_S = int(os.environ.get("OLLAMA_TIMEOUT_S", "120"))


def _analyze_with_ollama(image, crop_name: str, growth_stage: str = "") -> dict | None:
    """
    Analyze a crop image with a local multimodal model served by Ollama
    (default: gemma4:e2b). Returns dict or None on failure.

    No API key, no internet, no third-party costs — all inference runs in
    the local ollama container alongside the API.
    """
    import base64
    import requests

    try:
        # Resize the image to a reasonable size before encoding. CPU vision
        # inference scales with pixels, and a 3000+px panorama can push a
        # 4B-param model past 2 minutes. 768px on the long side is plenty
        # for disease detection (Gemma's vision tower processes at 768x768
        # internally anyway).
        max_side = 768
        if image.size[0] > max_side or image.size[1] > max_side:
            image = image.copy()
            image.thumbnail((max_side, max_side))

        img_buffer = BytesIO()
        image.save(img_buffer, format="JPEG", quality=85)
        b64_image = base64.b64encode(img_buffer.getvalue()).decode()

        user_prompt = (
            f"The farmer says this is: {crop_name}. First identify what crop/plant is "
            f"actually in this image, then analyze for diseases, pests, or nutrient deficiencies."
        )
        if growth_stage.lower() == "seedling":
            user_prompt += _SEEDLING_PROMPT_EXTRA

        # Ollama's /api/chat takes images alongside content per message.
        payload = {
            "model": OLLAMA_MODEL,
            "stream": False,
            "format": "json",  # ask Ollama to constrain to valid JSON output
            "messages": [
                {"role": "system", "content": _GEMINI_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": user_prompt,
                    "images": [b64_image],
                },
            ],
            "options": {
                "temperature": 0.2,
                "num_predict": 512,
            },
        }

        resp = requests.post(
            f"{OLLAMA_HOST}/api/chat",
            json=payload,
            timeout=OLLAMA_TIMEOUT_S,
        )
        resp.raise_for_status()
        body = resp.json()

        raw_text = (body.get("message") or {}).get("content", "").strip()
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

        logger.info(
            f"Ollama ({OLLAMA_MODEL}) analysis: crop={detected_crop}, "
            f"issue={detected}, confidence={confidence}, severity={severity}"
        )
        return {
            "source": "ollama",
            "model": OLLAMA_MODEL,
            "detected_crop": detected_crop,
            "detected_issue": detected,
            "treatment": treatment,
            "confidence": confidence,
            "severity": severity,
        }

    except Exception as e:
        logger.warning(f"Ollama analysis failed ({OLLAMA_MODEL} at {OLLAMA_HOST}): {e}")
        return None


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
        # NOT actual image analysis — keyword match against the notes / URL.
        # Use a low-to-mid confidence to reflect that we never looked at pixels.
        return {
            "source": "keyword",
            "detected_crop": None,
            "detected_issue": detected["issue"],
            "treatment": detected["treatment"],
            "confidence": 0.40 + (0.10 * random.random()),
            "severity": detected["severity"]
        }

    return {
        "source": "keyword",
        "detected_crop": None,
        "detected_issue": None,
        "treatment": None,
        "confidence": 0.20,
        "severity": "none"
    }


def _analyze_with_gemini(image, crop_name: str, growth_stage: str = "") -> dict | None:
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
        if growth_stage.lower() == "seedling":
            user_prompt += _SEEDLING_PROMPT_EXTRA

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


def _analyze_with_openai(image, crop_name: str, growth_stage: str = "") -> dict | None:
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
        if growth_stage.lower() == "seedling":
            user_prompt += _SEEDLING_PROMPT_EXTRA

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


def _analyze_with_groq(image, crop_name: str, growth_stage: str = "") -> dict | None:
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
        if growth_stage.lower() == "seedling":
            user_prompt += _SEEDLING_PROMPT_EXTRA

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


# In-memory cache for image analysis results — keyed by hash of image content
# + crop + stage. Avoids re-running expensive vision inference when the same
# image is analyzed again (e.g. clicking "Generate Recommendation" twice on
# the same field). Resets on api restart, which is fine for a demo.
_analysis_cache: dict[str, dict] = {}
_ANALYSIS_CACHE_MAX = 256  # cap so memory doesn't grow unbounded


def _cache_key(image_url: str, crop_name: str, growth_stage: str) -> str:
    """Stable cache key over image content + context. Uses sha256 of the
    image_url string (which already contains the full base64 data for uploads,
    or a unique URL for remote)."""
    import hashlib
    payload = f"{image_url}|{crop_name.lower()}|{growth_stage.lower()}".encode()
    return hashlib.sha256(payload).hexdigest()


def analyze_crop_image(image_url: str, notes: str = "", crop_name: str = "paddy", growth_stage: str = "") -> dict:
    """
    Analyze a crop image for disease detection.

    Fallback chain: Ollama (local) → Gemini → Groq → OpenAI → HuggingFace → keyword.
    Caches results in-process to avoid re-running expensive vision inference
    on the same image.

    Args:
        image_url: URL of input image
        notes: User notes about the image
        crop_name: The specific crop type (e.g. 'Paddy (Rice)', 'Cotton')
        growth_stage: The current growth stage (e.g. 'seedling', 'vegetative')

    Returns:
        dict: {detected_issue, treatment, confidence, severity, source, ...}
    """
    # Check cache first
    cache_key = _cache_key(image_url, crop_name, growth_stage)
    cached = _analysis_cache.get(cache_key)
    if cached is not None:
        logger.info(f"Image analysis cache HIT (key={cache_key[:8]}...) — skipping inference")
        # Mark the cached result so callers can tell it was cached.
        return {**cached, "cached": True}

    # Try to download the image
    image = None
    try:
        image = _download_image(image_url)
    except Exception as e:
        logger.warning(f"Image download failed ({e}), using keyword fallback.")
        result = _keyword_fallback(image_url, notes, crop_name)
        _analysis_cache[cache_key] = result
        return result

    def _cache_and_return(result: dict) -> dict:
        # Drop oldest entries when over cap (FIFO; cheap, dict preserves insertion order).
        if len(_analysis_cache) >= _ANALYSIS_CACHE_MAX:
            for old_key in list(_analysis_cache.keys())[: len(_analysis_cache) - _ANALYSIS_CACHE_MAX + 1]:
                del _analysis_cache[old_key]
        _analysis_cache[cache_key] = result
        return result

    # Level 1: Local Ollama (multimodal, primary path — no API, no internet)
    result = _analyze_with_ollama(image, crop_name, growth_stage)
    if result is not None:
        return _cache_and_return(result)

    # Level 2: Gemini Vision API (free, online fallback)
    result = _analyze_with_gemini(image, crop_name, growth_stage)
    if result is not None:
        return _cache_and_return(result)

    # Level 3: Groq Llama 4 Scout (free, online fallback)
    result = _analyze_with_groq(image, crop_name, growth_stage)
    if result is not None:
        return _cache_and_return(result)

    # Level 4: OpenAI GPT-4o-mini (paid)
    result = _analyze_with_openai(image, crop_name, growth_stage)
    if result is not None:
        return _cache_and_return(result)

    # Level 5: HuggingFace pretrained CNN (local PlantVillage)
    result = _analyze_with_huggingface(image, crop_name)
    if result is not None:
        return _cache_and_return(result)

    # Level 6: Keyword fallback (NOT image analysis — searches notes/URL for symptom words)
    logger.info("All vision models unavailable, using keyword fallback.")
    return _cache_and_return(_keyword_fallback(image_url, notes, crop_name))


def get_treatment_for_issue(issue: str, crop_name: str = "") -> str:
    """
    Deprecated: Treatment is now returned directly by analyze_crop_image.
    Kept for backward compatibility if needed.
    """
    return "Consult Agronomist"
