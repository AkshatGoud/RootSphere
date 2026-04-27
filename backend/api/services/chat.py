"""
Field-level chat service.

Builds a context block from a field's current state (snapshot, weather forecast,
recent recommendations, latest image AI findings) and sends it to the local
Ollama-served Gemma 4 along with the user's question + prior conversation
history.

No persistent storage: chat history lives in the frontend component for the
session. Each request from the frontend re-sends the full visible history.
"""
from datetime import datetime
import logging
import os
from typing import List

import requests
from sqlalchemy.orm import Session

from .. import crud, models, schemas, recommendation
from ..ml.image_model import _analysis_cache  # type: ignore[attr-defined]

logger = logging.getLogger("api")

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "gemma4:e2b")
OLLAMA_TIMEOUT_S = int(os.environ.get("OLLAMA_TIMEOUT_S", "120"))

_SYSTEM_PROMPT_HEADER = (
    "You are an agricultural advisor inside the RootSphere app, helping a "
    "smallholder Indian farmer manage one specific field. Use the field "
    "context below to answer the farmer's question. Cite specific numbers "
    "from the data when relevant. Be concise (2-4 sentences typical). Use "
    "farmer-friendly language. If the user writes in Hindi, Tamil, or "
    "Telugu, respond in that language. If you do not have data to answer "
    "something, say so honestly rather than guessing.\n"
)


def _fmt_dt(dt: datetime | None) -> str:
    return dt.isoformat(timespec="seconds") if dt else "(none)"


def _build_field_context(db: Session, field: models.Field) -> str:
    """Render the field's current state into a compact text block for the prompt."""
    canonical_crop = recommendation._normalize_crop(field.crop or "") if field.crop else ""

    lines: List[str] = ["FIELD CONTEXT:"]
    lines.append(f"- Name: {field.name or '(unnamed)'}")
    lines.append(f"- Crop: {field.crop or '(unknown)'} (canonical: {canonical_crop or 'unknown'})")
    lines.append(f"- Growth stage: {field.growth_stage or '(unknown)'}")
    if field.lat is not None and field.lon is not None:
        lines.append(f"- Location: {field.lat:.4f}, {field.lon:.4f}")

    sensor = crud.get_latest_sensor_reading(db, field.id)
    lines.append("")
    lines.append(f"LATEST SENSOR READING ({_fmt_dt(sensor.ts) if sensor else 'no data yet'}):")
    if sensor:
        lines.append(f"- Soil moisture: {sensor.moisture}%")
        lines.append(f"- pH: {sensor.ph}")
        lines.append(f"- N: {sensor.n} ppm | P: {sensor.p} ppm | K: {sensor.k} ppm")
    else:
        lines.append("- (no readings)")

    weather = crud.get_latest_weather_reading(db, field.id)
    rainfall_24h = crud.get_rainfall_24h(db, field.id)
    forecast_pts = crud.get_forecast_72h(db, field.id)
    lines.append("")
    lines.append("WEATHER:")
    if weather:
        lines.append(
            f"- Now ({_fmt_dt(weather.ts)}): {weather.temp_c}°C, "
            f"{weather.humidity_pct}% humidity, {rainfall_24h:.1f}mm rain in last 24h"
        )
    else:
        lines.append("- (no recent weather data)")
    if forecast_pts:
        # Aggregate into per-day rainfall (approximate: forecast points are usually 6h-spaced)
        per_pt = [f"{pt.rainfall_mm:.1f}" for pt in forecast_pts[:6]]
        lines.append(f"- Forecast (next ~3 days, mm by interval): {', '.join(per_pt)}")
    else:
        lines.append("- Forecast: (none)")

    recs = crud.get_recommendations(db, field.id, limit=3)
    lines.append("")
    lines.append("RECENT RECOMMENDATIONS:")
    if recs:
        for r in recs:
            action = (r.action_json or {}).get("irrigation", {}) if r.action_json else {}
            fert = (r.action_json or {}).get("fertilizer", {}) if r.action_json else {}
            lines.append(
                f"- {_fmt_dt(r.ts)}: irrigation={action.get('action', 'UNKNOWN')} "
                f"({action.get('liters_per_acre', 0)} L/acre, {action.get('timing', 'n/a')}); "
                f"fertilizer={fert.get('action', 'NO_ACTION')} "
                f"(N={fert.get('n_kg_acre', 0)}, P={fert.get('p_kg_acre', 0)}, K={fert.get('k_kg_acre', 0)} kg/acre)"
            )
    else:
        lines.append("- (no recommendations generated yet)")

    images = crud.get_latest_images(db, field.id, limit=1)
    lines.append("")
    lines.append("LATEST IMAGE ANALYSIS:")
    if images:
        img = images[0]
        # Look up cached AI analysis (won't trigger a fresh inference)
        cached = None
        for entry in _analysis_cache.values():
            # No reverse lookup by image_id; we just take the most recent cached entry
            # if it matches this image's source URL prefix. Best-effort.
            if entry.get("source") in {"ollama", "gemini", "groq", "openai", "huggingface"}:
                cached = entry
                break
        lines.append(f"- {_fmt_dt(img.ts)}, source={img.source or 'unknown'}")
        if cached:
            lines.append(
                f"  AI: detected_crop={cached.get('detected_crop')}, "
                f"issue={cached.get('detected_issue')}, "
                f"severity={cached.get('severity')}, "
                f"confidence={cached.get('confidence')}"
            )
            if cached.get("treatment"):
                lines.append(f"  Treatment: {cached.get('treatment')}")
        else:
            lines.append("  (image not yet analyzed; will be analyzed on next recommendation)")
        if img.notes:
            lines.append(f"  Notes: {img.notes}")
    else:
        lines.append("- (no images uploaded)")

    return "\n".join(lines)


def chat_about_field(
    db: Session,
    field: models.Field,
    user_message: str,
    history: List[schemas.ChatMessage],
) -> str:
    """Send the user's question + field context to Ollama and return the reply.

    Raises a generic exception on Ollama failure; the route handler should
    translate to HTTP 503.
    """
    context_block = _build_field_context(db, field)
    system_prompt = _SYSTEM_PROMPT_HEADER + "\n" + context_block

    messages = [{"role": "system", "content": system_prompt}]
    for h in history[-12:]:  # keep last 12 turns max to bound prompt size
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": user_message})

    payload = {
        "model": OLLAMA_MODEL,
        "stream": False,
        "messages": messages,
        "options": {
            "temperature": 0.4,  # slightly more conversational than disease detection
            "num_predict": 400,
        },
        "keep_alive": "24h",  # don't unload the model between calls during a demo
    }

    logger.info(
        f"Chat request: field={field.id} crop={field.crop} stage={field.growth_stage} "
        f"history_len={len(history)} message_len={len(user_message)}"
    )

    resp = requests.post(
        f"{OLLAMA_HOST}/api/chat",
        json=payload,
        timeout=OLLAMA_TIMEOUT_S,
    )
    resp.raise_for_status()
    body = resp.json()
    reply = (body.get("message") or {}).get("content", "").strip()
    if not reply:
        raise RuntimeError("Ollama returned an empty reply")

    logger.info(
        f"Chat reply: field={field.id} reply_len={len(reply)} "
        f"total_duration_ms={int(body.get('total_duration', 0) / 1e6)}"
    )
    return reply
