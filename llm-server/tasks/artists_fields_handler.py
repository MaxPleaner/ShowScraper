"""Artists fields research handler."""
import json
import asyncio
import uuid
from datetime import datetime
from typing import AsyncGenerator, Dict, List, Any

from core.config import Config
from core.cache import build_cache_key, load_cache, save_cache
from core.prompts import (
    build_youtube_prompt,
    build_bio_genres_prompt,
    build_website_prompt,
    build_music_link_prompt,
)
from core.tools import build_tools, has_search_tool
from core.llm import run_json_prompt
from core.logging import start_trace, end_trace, create_datapoint_logger


async def _research_single_field(
    artist: str,
    field: str,
    tools: List,
    has_search: bool,
    field_timeout: int
) -> Dict[str, Any]:
    """Research a single field for an artist. Returns cached result if available."""
    prompt_map = {
        "youtube": build_youtube_prompt,
        "bio_genres": build_bio_genres_prompt,
        "website": build_website_prompt,
        "music": build_music_link_prompt,
    }
    
    if field not in prompt_map:
        return {"error": f"Unknown field: {field}"}
    
    try:
        res = await asyncio.wait_for(
            run_json_prompt(prompt_map[field](artist), tools, has_search),
            timeout=field_timeout
        )
        return res or {}
    except Exception as e:
        msg = str(e) or e.__class__.__name__
        return {"error": msg}


async def artists_fields_handler(
    event_data: Dict[str, str],
    artists: List[str]
) -> AsyncGenerator[Dict[str, str], None]:
    """
    Research field details for a list of artists.
    
    Architecture:
    - All artist+field combinations are requested in parallel
    - Each field result is streamed to client as it completes
    - Results are cached per artist (with all fields)
    
    Events:
    - {"event": "data", "data": "..."} where data is JSON with:
      - {"type": "artist_datapoint", "artist": "...", "field": "...", "value": {...}}
    - {"event": "data", "data": "..."} where data is JSON with:
      - {"type": "complete"}
    """
    tools = build_tools()
    has_search = has_search_tool(tools)
    field_timeout = Config.ARTIST_DATAPOINT_TIMEOUT
    
    # Expected fields for each artist
    expected_fields = ["youtube", "bio_genres", "website", "music"]
    
    # Check cache for each artist
    artist_cache_map: Dict[str, Dict[str, Any]] = {}
    artists_to_research: List[str] = []
    
    for artist in artists:
        cache_key = build_cache_key(event_data, f"artist_fields_{artist}")
        cached = load_cache(cache_key)
        if cached and "fields" in cached:
            artist_cache_map[artist] = cached["fields"]
            # Stream cached fields immediately
            for field, value in cached["fields"].items():
                yield {
                    "event": "data",
                    "data": json.dumps({
                        "type": "artist_datapoint",
                        "artist": artist,
                        "field": field,
                        "value": value
                    })
                }
        else:
            artists_to_research.append(artist)
            artist_cache_map[artist] = {}
    
    # If all artists are cached, we're done
    if not artists_to_research:
        yield {"event": "data", "data": json.dumps({"type": "complete"})}
        return
    
    trace_obj = start_trace([f"concert-artists-fields", event_data.get('title', 'unknown')[:50]])
    
    try:
        ts = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        run_id = str(uuid.uuid4())[:8]
        log_dp = create_datapoint_logger(ts, run_id)
        
        # Create all field research tasks in parallel
        # This creates N artists × M fields = total parallel requests
        all_tasks = []
        task_to_artist_field = {}
        
        for artist in artists_to_research:
            for field in expected_fields:
                task = asyncio.create_task(
                    _research_single_field(artist, field, tools, has_search, field_timeout)
                )
                all_tasks.append(task)
                task_to_artist_field[id(task)] = (artist, field)
        
        # Stream results as they complete
        for task in asyncio.as_completed(all_tasks):
            artist, field = task_to_artist_field[id(task)]
            try:
                value = await task
                artist_cache_map[artist][field] = value
                
                # Stream the datapoint immediately
                yield {
                    "event": "data",
                    "data": json.dumps({
                        "type": "artist_datapoint",
                        "artist": artist,
                        "field": field,
                        "value": value
                    })
                }
                
                log_dp({"type": "datapoint", "artist": artist, "field": field, "value": value})
                
                # Cache when all fields for an artist are complete
                if all(f in artist_cache_map[artist] for f in expected_fields):
                    cache_key = build_cache_key(event_data, f"artist_fields_{artist}")
                    save_cache(cache_key, {
                        "artist": artist,
                        "fields": artist_cache_map[artist]
                    })
                    log_dp({"type": "artist_complete", "artist": artist})
            
            except Exception as e:
                msg = str(e) or e.__class__.__name__
                error_value = {"error": msg}
                artist_cache_map[artist][field] = error_value
                yield {
                    "event": "data",
                    "data": json.dumps({
                        "type": "artist_datapoint",
                        "artist": artist,
                        "field": field,
                        "value": error_value
                    })
                }
        
        yield {"event": "data", "data": json.dumps({"type": "complete"})}
        log_dp({"type": "complete", "artists": artists})
        
        end_trace(trace_obj, "Success")
    
    except Exception as e:
        error_msg = f"Error: {str(e)}"
        yield {"event": "error", "data": error_msg}
        end_trace(trace_obj, "Fail")
