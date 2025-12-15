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
    """Research a single field for an artist and return display-ready data (with markdown)."""
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
        res = res or {}
    except Exception as e:
        msg = str(e) or e.__class__.__name__
        return {"error": msg}
    
    # Normalize into a markdown-friendly shape
    if field == "youtube":
        url = res.get("youtube_url") or res.get("url") or res.get("fallback_search_url")
        if url:
            return {"url": url, "markdown": f"[Watch]({url})"}
        return {"error": "not_found"}
    
    if field == "bio_genres":
        bio = res.get("bio") or "(not found)"
        genres = res.get("genres") or []
        genres_str = ", ".join(genres) if genres else "(not found)"
        md = f"**Bio:** {bio}\n\n**Genres:** {genres_str}"
        return {"bio": bio, "genres": genres, "markdown": md}
    
    if field == "website":
        label = res.get("label")
        url = res.get("url")
        if label and url and label != "not_found":
            return {"label": label, "url": url, "markdown": f"[{label}]({url})"}
        return {"error": "not_found"}
    
    if field == "music":
        platform = res.get("platform")
        url = res.get("url")
        if platform and url and platform != "not_found":
            return {"platform": platform, "url": url, "markdown": f"[{platform}]({url})"}
        return {"error": "not_found"}
    
    return {"error": "Unhandled field"}


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
    # Parse no_cache - handle both bool and string "true"/"false"
    no_cache_raw = event_data.get("no_cache", False)
    if isinstance(no_cache_raw, str):
        no_cache = no_cache_raw.lower() in ("true", "1", "yes")
    else:
        no_cache = bool(no_cache_raw)
    
    print(f"[artists_fields_handler] no_cache={no_cache}, type={type(no_cache)}, raw={no_cache_raw}")
    
    # Check cache for each artist
    artist_cache_map: Dict[str, Dict[str, Any]] = {}
    artists_to_research: List[str] = []
    
    for artist in artists:
        if not no_cache:
            try:
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
                    continue  # Skip to next artist if cached
            except Exception as e:
                print(f"[artists_fields_handler] Error loading cache for {artist}: {e}")
                # Continue to research this artist
        
        # Artist not cached or no_cache is True
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
        # Wrap each task to preserve artist/field information
        async def _research_with_metadata(artist: str, field: str):
            """Wrapper to preserve artist/field metadata with the result."""
            result = await _research_single_field(artist, field, tools, has_search, field_timeout)
            return (artist, field, result)
        
        all_tasks = []
        for artist in artists_to_research:
            for field in expected_fields:
                task = asyncio.create_task(
                    _research_with_metadata(artist, field)
                )
                all_tasks.append(task)
        
        # Stream results as they complete
        # asyncio.as_completed returns an iterator of futures, use regular for loop
        for completed_task in asyncio.as_completed(all_tasks):
            try:
                artist, field, value = await completed_task
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
                
                # Cache when all fields for an artist are complete (only if not skipping cache)
                if all(f in artist_cache_map[artist] for f in expected_fields) and not no_cache:
                    try:
                        cache_key = build_cache_key(event_data, f"artist_fields_{artist}")
                        save_cache(cache_key, {
                            "artist": artist,
                            "fields": artist_cache_map[artist]
                        })
                    except Exception as e:
                        print(f"[artists_fields_handler] Error saving cache for {artist}: {e}")
                        # Non-fatal error, continue
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
        # Provide a more user-friendly error message
        error_msg = str(e) or e.__class__.__name__
        # If the error message looks like a memory address or object ID, provide a generic message
        if error_msg.isdigit() and len(error_msg) > 8:
            error_msg = "A timeout or processing error occurred. Please try again."
        yield {"event": "error", "data": f"Error: {error_msg}"}
        end_trace(trace_obj, "Fail")
