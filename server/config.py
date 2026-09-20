"""Runtime configuration.

The inference token is read from REPLIT_TOKEN so the Hugging Face Space secret
of that name works as-is; HF_TOKEN is accepted as a fallback for local runs.
"""

from __future__ import annotations

import os


def _clean(value: str | None) -> str | None:
    value = (value or "").strip()
    return value or None


INFERENCE_TOKEN = _clean(os.getenv("REPLIT_TOKEN")) or _clean(os.getenv("HF_TOKEN"))
INFERENCE_BASE_URL = (
    _clean(os.getenv("HF_ROUTER_URL")) or "https://router.huggingface.co/v1"
).rstrip("/")
MODEL_ID = _clean(os.getenv("MODEL_ID")) or "meta-llama/Llama-3.3-70B-Instruct"
REQUEST_TIMEOUT = float(os.getenv("REQUEST_TIMEOUT", "60"))

# Nominatim's usage policy requires an identifying User-Agent with a contact.
GEOCODER_URL = "https://nominatim.openstreetmap.org/search"
GEOCODER_USER_AGENT = (
    _clean(os.getenv("GEOCODER_USER_AGENT"))
    or "property-valuation-agent/1.0 (https://github.com/tanmoycuat/property-valuation-agent)"
)
GEOCODER_CACHE_SIZE = 512


def assistant_configured() -> bool:
    return INFERENCE_TOKEN is not None
