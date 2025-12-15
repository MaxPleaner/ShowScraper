"""FastAPI application for LLM task server."""
from fastapi import FastAPI, Query, Request
from core.config import Config
from core.rate_limiting import setup_rate_limiting
from core.cors import setup_cors
from core.logging import init_agentops
from core.handlers.concert_research import handle_concert_research

Config.ensure_dirs()
init_agentops()
app = FastAPI(title="LLM Task Server", version="1.0.0")
limiter = setup_rate_limiting(app)
setup_cors(app)

@app.get("/")
def root():
    """Root endpoint with service information."""
    return {
        "service": "LLM Task Server",
        "version": "1.0.0",
        "tasks": ["concert-research"]
    }


@app.get("/tasks/concert-research")
@limiter.limit(Config.CONCERT_RESEARCH_RATE_LIMIT)
async def concert_research(
    request: Request,
    date: str = Query(..., description="Event date (YYYY-MM-DD)"),
    title: str = Query(..., description="Event title/artists"),
    venue: str = Query(..., description="Venue name"),
    url: str = Query("", description="Event URL (optional)"),
    mode: str = Query("quick", description="Research mode"),
    artist: str = Query("", description="Single artist name (required for 'artist_fields' mode)"),
    artists: str = Query("", description="JSON array of artist names (required for 'artists_fields' mode)")
):
    """Stream concert research via SSE."""
    return await handle_concert_research(request, date, title, venue, url, mode, artist, artists)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=Config.HOST, port=Config.PORT)
