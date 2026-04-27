"""
Smoke-test the image disease detection pipeline.

Usage (from repo root, after `docker compose up -d`):

    docker compose exec api python scripts/test_image_model.py path/to/leaf.jpg [--crop rice]

Prints which backend handled the request, the detected crop/issue, severity,
confidence, and any treatment suggestion. Useful for verifying that the
Ollama + Gemma 4 path is actually working before a demo.
"""
import argparse
import base64
import json
import os
import sys

# Allow running both as `python -m scripts.test_image_model` and as a script
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.ml.image_model import analyze_crop_image  # noqa: E402


def _to_data_url(path: str) -> str:
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    ext = os.path.splitext(path)[1].lstrip(".").lower() or "jpeg"
    if ext == "jpg":
        ext = "jpeg"
    return f"data:image/{ext};base64,{b64}"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image", help="Path to a JPG/PNG/WebP image")
    parser.add_argument("--crop", default="rice", help="Crop name (rice/cotton/groundnut/sorghum)")
    parser.add_argument("--stage", default="vegetative", help="Growth stage (e.g. seedling/vegetative)")
    parser.add_argument("--notes", default="", help="Free-text notes")
    args = parser.parse_args()

    if not os.path.exists(args.image):
        print(f"ERROR: file not found: {args.image}", file=sys.stderr)
        return 2

    image_url = _to_data_url(args.image)
    print(f"Analyzing {args.image} (crop={args.crop}, stage={args.stage})...")
    result = analyze_crop_image(
        image_url=image_url,
        notes=args.notes,
        crop_name=args.crop,
        growth_stage=args.stage,
    )
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
