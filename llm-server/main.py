from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from dotenv import load_dotenv
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import os
import re
from datetime import datetime
import json
from pathlib import Path
import agentops

# Import task handlers
from tasks.concert_research import concert_research_handler

load_dotenv()

# Initialize AgentOps if API key is available
if os.getenv("AGENTOPS_API_KEY"):
    agentops.init(api_key=os.getenv("AGENTOPS_API_KEY"), auto_start_session=True)
    print("✓ AgentOps initialized")

limiter = Limiter(key_func=get_remote_address, default_limits=["20/minute", "200/day"])
app = FastAPI(title="LLM Task Server", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, lambda request, exc: HTTPException(status_code=429, detail="Too many requests"))
app.add_middleware(SlowAPIMiddleware)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://bayareashows.org", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "service": "LLM Task Server",
        "version": "1.0.0",
        "tasks": ["concert-research"]
    }

@app.get("/tasks/concert-research")
@limiter.limit("10/minute")
async def concert_research(
    request: Request,
    date: str = Query(..., description="Event date (YYYY-MM-DD)"),
    title: str = Query(..., description="Event title/artists"),
    venue: str = Query(..., description="Venue name"),
    url: str = Query("", description="Event URL (optional)"),
    mode: str = Query("quick", description="Research mode: 'quick' (fast summary), 'artists_list' (extract artists), 'artist_fields' (research single artist), or 'artists_fields' (research multiple artists)"),
    artist: str = Query("", description="Single artist name (required for 'artist_fields' mode)"),
    artists: str = Query("", description="JSON array of artist names (required for 'artists_fields' mode)")
):
    """
    Stream concert research via SSE using LangChain + Claude.

    Modes:
    - quick: Fast streaming 2-3 sentence summary (no tools, ~2 seconds)
    - artists_list: Extract list of performing artists (~5 seconds)
    - artist_fields: Research fields for a single artist (~15 seconds)
    - artists_fields: Research fields for given artists list (~15 seconds per artist)

    This endpoint performs web research about a concert event and streams
    results in real-time using Server-Sent Events.
    """

    # Basic input validation and normalization
    date_match = re.match(r"^(\d{4}-\d{2}-\d{2})", date)
    if not date_match:
        raise HTTPException(status_code=400, detail="Invalid date format (expected YYYY-MM-DD)")
    clean_date = date_match.group(1)

    def normalize(field: str) -> str:
        # Replace non-breaking spaces, collapse whitespace, trim ends
        field = (field or "").replace("\u00a0", " ")
        field = re.sub(r"\s+", " ", field).strip()
        return field

    def clean(field, name, max_len):
        cleaned = normalize(field)
        if not cleaned:
            raise HTTPException(status_code=400, detail=f"{name} is required")
        if len(cleaned) > max_len:
            raise HTTPException(status_code=400, detail=f"{name} too long (max {max_len} chars)")
        return cleaned

    safe_title = clean(title, "title", 220)
    safe_venue = clean(venue, "venue", 140)
    safe_url = normalize(url)
    if safe_url and len(safe_url) > 300:
        raise HTTPException(status_code=400, detail="url too long (max 300 chars)")

    # Validate mode
    if mode not in ["quick", "artists_list", "artist_fields", "artists_fields", "detailed"]:
        raise HTTPException(status_code=400, detail="mode must be 'quick', 'artists_list', 'artist_fields', 'artists_fields', or 'detailed'")

    # Parse artists parameter if provided
    artists_list = None
    if artists:
        try:
            artists_list = json.loads(artists)
            if not isinstance(artists_list, list):
                raise HTTPException(status_code=400, detail="artists must be a JSON array")
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON in artists parameter")

    # Validate artist/artists required for respective modes
    if mode == "artist_fields" and not artist:
        raise HTTPException(status_code=400, detail="artist parameter required for artist_fields mode")
    if mode == "artists_fields" and not artists_list:
        raise HTTPException(status_code=400, detail="artists parameter required for artists_fields mode")

    event_data = {
        "date": clean_date,
        "title": safe_title,
        "venue": safe_venue,
        "url": safe_url
    }

    # per-request log
    try:
        ts = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        req_log = {
            "timestamp": ts,
            "ip": request.client.host if request.client else None,
            "mode": mode,
            "query": event_data
        }
        if artists_list:
            req_log["artists"] = artists_list
        if artist:
            req_log["artist"] = artist
        log_dir = Path(__file__).resolve().parent / "logs"
        log_path = log_dir / f"req_{ts}_{os.getpid()}.json"
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_path.write_text(json.dumps(req_log, indent=2))
    except Exception:
        pass

    return EventSourceResponse(concert_research_handler(event_data, mode=mode, artist=artist, artists=artists_list))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
