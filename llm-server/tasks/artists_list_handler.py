"""Artists list extraction handler."""
import json
from typing import AsyncGenerator, Dict

from core.config import Config
from core.cache import build_cache_key, load_cache, save_cache
from core.prompts import build_extract_artists_prompt
from core.tools import build_tools
from core.llm import create_llm, run_with_tools
from core.logging import start_trace, end_trace


async def artists_list_handler(event_data: Dict[str, str]) -> AsyncGenerator[Dict[str, str], None]:
    """
    Extract artist list from event data.
    Streams: {"event": "data", "data": "..."} where data is JSON array of artist names
    """
    cache_key = build_cache_key(event_data, "artists_list")
    cached = load_cache(cache_key)
    if cached and "artists" in cached:
        print(f"[cache] artists_list hit for key={cache_key}")
        yield {"event": "data", "data": json.dumps(cached["artists"])}
        return

    trace_obj = start_trace(["concert-artists-list", event_data.get('title', 'unknown')[:50]])

    try:
        llm = create_llm(
            model=Config.DETAILED_MODEL,
            streaming=False,
            max_tokens=Config.DETAILED_MAX_TOKENS,
            temperature=Config.TEMPERATURE
        )

        tools = build_tools()
        extract_prompt = build_extract_artists_prompt(event_data)
        artist_list_text = await run_with_tools(llm, tools, extract_prompt)

        # Parse artist list (one artist per line)
        artists = [
            line.strip()
            for line in artist_list_text.strip().split('\n')
            if line.strip() and line.strip() != "Unable to determine artists"
        ]

        if not artists or artist_list_text.strip() == "Unable to determine artists":
            yield {"event": "error", "data": "Unable to determine artists for this event."}
            end_trace(trace_obj, "Success")
            return

        # Stream the artist list (JSON-serialized for SSE)
        yield {"event": "data", "data": json.dumps(artists)}

        # Cache the result
        save_cache(cache_key, {"artists": artists})

        end_trace(trace_obj, "Success")

    except Exception as e:
        error_msg = f"Error: {str(e)}"
        yield {"event": "error", "data": error_msg}
        end_trace(trace_obj, "Fail")
