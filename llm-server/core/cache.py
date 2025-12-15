"""Caching functionality for research results."""
import re
import hashlib
import json
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any
from core.config import Config


def normalize_cache_field(value: str) -> str:
    """Normalize a field value for cache key generation."""
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def build_cache_key(event_data: dict, mode: str) -> str:
    """Build a cache key from event data and mode."""
    base = "|".join([
        normalize_cache_field(event_data.get("date", "")),
        normalize_cache_field(event_data.get("venue", "")),
        normalize_cache_field(event_data.get("title", "")),
        mode.lower().strip(),
    ])
    return hashlib.sha256(base.encode("utf-8")).hexdigest()


def _cache_path(cache_key: str) -> Path:
    """Get the cache file path for a given key."""
    path = (Config.CACHE_DIR / f"{cache_key}.json").resolve()
    # Ensure the resolved path stays within the cache directory to avoid traversal
    resolved_cache = Config.CACHE_DIR.resolve()
    if resolved_cache not in path.parents and path != resolved_cache:
        raise ValueError("Invalid cache path")
    return path


def load_cache(cache_key: str) -> Optional[Dict[str, Any]]:
    """Load cached data if it exists."""
    try:
        path = _cache_path(cache_key)
        if not path.exists():
            return None
        data = json.loads(path.read_text())
        if data.get("key") != cache_key:
            return None
        return data
    except Exception:
        return None


def save_cache(cache_key: str, payload: Dict[str, Any]):
    """Save data to cache."""
    try:
        path = _cache_path(cache_key)
        path.parent.mkdir(parents=True, exist_ok=True)
        payload_with_meta = {
            **payload,
            "key": cache_key,
            "cached_at": datetime.utcnow().isoformat() + "Z",
        }
        tmp_path = path.with_suffix(".tmp")
        tmp_path.write_text(json.dumps(payload_with_meta, indent=2))
        tmp_path.replace(path)
    except Exception:
        pass
