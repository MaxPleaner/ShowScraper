"""Input validation utilities."""
import re
from fastapi import HTTPException
from typing import Dict


def normalize_field(field: str) -> str:
    """Normalize a field value (replace non-breaking spaces, collapse whitespace, trim)."""
    field = (field or "").replace("\u00a0", " ")
    field = re.sub(r"\s+", " ", field).strip()
    return field


def validate_date(date: str) -> str:
    """Validate and normalize date format (YYYY-MM-DD)."""
    date_match = re.match(r"^(\d{4}-\d{2}-\d{2})", date)
    if not date_match:
        raise HTTPException(status_code=400, detail="Invalid date format (expected YYYY-MM-DD)")
    return date_match.group(1)


def validate_field(field: str, name: str, max_len: int) -> str:
    """Validate and clean a field."""
    cleaned = normalize_field(field)
    if not cleaned:
        raise HTTPException(status_code=400, detail=f"{name} is required")
    if len(cleaned) > max_len:
        raise HTTPException(status_code=400, detail=f"{name} too long (max {max_len} chars)")
    return cleaned


def validate_event_data(date: str, title: str, venue: str, url: str = "") -> Dict[str, str]:
    """Validate and normalize event data."""
    clean_date = validate_date(date)
    safe_title = validate_field(title, "title", 220)
    safe_venue = validate_field(venue, "venue", 140)
    safe_url = normalize_field(url)
    
    if safe_url and len(safe_url) > 300:
        raise HTTPException(status_code=400, detail="url too long (max 300 chars)")
    
    return {
        "date": clean_date,
        "title": safe_title,
        "venue": safe_venue,
        "url": safe_url
    }


def validate_mode(mode: str) -> str:
    """Validate research mode."""
    valid_modes = ["quick", "artists_list", "artists_fields"]
    if mode not in valid_modes:
        raise HTTPException(
            status_code=400,
            detail=f"mode must be one of: {', '.join(valid_modes)}"
        )
    return mode
