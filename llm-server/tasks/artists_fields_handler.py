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
from core.llm import run_json_prompt, SerperCreditsExhausted
from core.logging import start_trace, end_trace, create_datapoint_logger


def verbose_print(*args, **kwargs):
    """Print only if verbose mode is enabled."""
    if Config.VERBOSE:
        print(*args, **kwargs)


async def _research_single_field(
    artist: str,
    field: str,
    tools: List,
    has_search: bool,
    field_timeout: int,
    event_data: Dict[str, str] = None
) -> Dict[str, Any]:
    """Research a single field for an artist and return display-ready data (with markdown)."""
    prompt_map = {
        "youtube": lambda a: build_youtube_prompt(a),
        "bio": lambda a: build_bio_genres_prompt(a),
        "genres": lambda a: build_bio_genres_prompt(a),
        "website": lambda a: build_website_prompt(a, event_data),
        "music": lambda a: build_music_link_prompt(a, event_data),
    }
    
    if field not in prompt_map:
        return {"error": f"Unknown field: {field}"}
    
    # Filter tools: only include Spotify tool for "music" field
    field_tools = [t for t in tools if field == "music" or t.name != "spotify_search_artist"]
    
    try:
        # Create descriptive query name for logging
        field_display_names = {
            "youtube": "YouTube URL",
            "bio": "Bio",
            "genres": "Genres",
            "website": "Website",
            "music": "Music Link"
        }
        query_desc = f"{field_display_names.get(field, field)} for {artist}"
        
        res = await asyncio.wait_for(
            run_json_prompt(prompt_map[field](artist), field_tools, has_search, query_desc),
            timeout=field_timeout
        )
        res = res or {}
    except asyncio.TimeoutError:
        verbose_print(f"[_research_single_field] Timeout after {field_timeout}s for {artist} - {field}")
        raise  # Re-raise to be handled by caller with context
    except SerperCreditsExhausted:
        # Re-raise to be caught by the handler
        raise
    except Exception as e:
        msg = str(e) or e.__class__.__name__
        verbose_print(f"[_research_single_field] Error for {artist} - {field}: {e}")
        return {"error": msg}
    
    # Normalize into a markdown-friendly shape
    if field == "youtube":
        url = res.get("youtube_url") or res.get("url") or res.get("fallback_search_url")
        if url:
            return {"url": url, "markdown": f"[Watch]({url})"}
        return {"error": "not_found"}
    
    if field == "bio":
        bio = res.get("bio") or "(not found)"
        return {"bio": bio, "markdown": bio}
    
    if field == "genres":
        genres = res.get("genres") or []
        genres_str = ", ".join(genres) if genres else "(not found)"
        return {"genres": genres, "markdown": genres_str}
    
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
    expected_fields = ["youtube", "bio", "genres", "website", "music"]
    # Parse no_cache - handle both bool and string "true"/"false"
    no_cache_raw = event_data.get("no_cache", False)
    if isinstance(no_cache_raw, str):
        no_cache = no_cache_raw.lower() in ("true", "1", "yes")
    else:
        no_cache = bool(no_cache_raw)
    
    verbose_print(f"[artists_fields_handler] no_cache={no_cache}, type={type(no_cache)}, raw={no_cache_raw}")
    
    # Check cache for each artist
    artist_cache_map: Dict[str, Dict[str, Any]] = {}
    artists_to_research: List[str] = []
    
    for artist in artists:
        if not no_cache:
            try:
                cache_key = build_cache_key(event_data, f"artist_fields_{artist}")
                cached = load_cache(cache_key)
                if cached and "fields" in cached:
                    fields = cached["fields"]
                    
                    # Migrate old bio_genres field to separate bio and genres fields
                    if "bio_genres" in fields:
                        bio_genres_value = fields["bio_genres"]
                        if isinstance(bio_genres_value, dict):
                            # Extract bio and genres from the old structure
                            if "bio" in bio_genres_value:
                                fields["bio"] = {"bio": bio_genres_value["bio"], "markdown": bio_genres_value.get("bio", "(not found)")}
                            if "genres" in bio_genres_value:
                                genres_list = bio_genres_value.get("genres", [])
                                genres_str = ", ".join(genres_list) if genres_list else "(not found)"
                                fields["genres"] = {"genres": genres_list, "markdown": genres_str}
                        # Remove the old field
                        del fields["bio_genres"]
                    
                    artist_cache_map[artist] = fields
                    # Stream cached fields immediately (only new field names)
                    for field in expected_fields:
                        if field in fields:
                            yield {
                                "event": "data",
                                "data": json.dumps({
                                    "type": "artist_datapoint",
                                    "artist": artist,
                                    "field": field,
                                    "value": fields[field]
                                })
                            }
                    continue  # Skip to next artist if cached
            except Exception as e:
                verbose_print(f"[artists_fields_handler] Error loading cache for {artist}: {e}")
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
            try:
                result = await _research_single_field(artist, field, tools, has_search, field_timeout, event_data)
                return (artist, field, result)
            except asyncio.TimeoutError:
                # Re-raise with context
                raise asyncio.TimeoutError(f"Timeout after {field_timeout}s for {artist} - {field}")
            except Exception as e:
                # Wrap exception to preserve artist/field context
                raise type(e)(f"{artist} - {field}: {str(e)}") from e
        
        # Store task metadata for error handling
        task_metadata = {}
        all_tasks = []
        for artist in artists_to_research:
            for field in expected_fields:
                task = asyncio.create_task(
                    _research_with_metadata(artist, field)
                )
                task_metadata[task] = (artist, field)
                all_tasks.append(task)
        
        print(f"  → Starting {len(all_tasks)} parallel field queries ({len(artists_to_research)} artists × {len(expected_fields)} fields)")
        
        # Stream results as they complete
        # asyncio.as_completed returns an iterator of futures, use regular for loop
        for completed_task in asyncio.as_completed(all_tasks):
            artist, field = task_metadata.get(completed_task, ("unknown", "unknown"))
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
                
                # Always cache when all fields for an artist are complete (even if no_cache was True)
                # The no_cache flag only controls reading from cache, not writing to it
                if all(f in artist_cache_map[artist] for f in expected_fields):
                    try:
                        cache_key = build_cache_key(event_data, f"artist_fields_{artist}")
                        save_cache(cache_key, {
                            "artist": artist,
                            "fields": artist_cache_map[artist]
                        })
                        if no_cache:
                            verbose_print(f"[artists_fields_handler] Saved fresh data to cache for {artist} (refetch)")
                    except Exception as e:
                        verbose_print(f"[artists_fields_handler] Error saving cache for {artist}: {e}")
                        # Non-fatal error, continue
                    log_dp({"type": "artist_complete", "artist": artist})
            
            except SerperCreditsExhausted:
                # Re-raise to be caught by outer handler
                raise
            except asyncio.TimeoutError as e:
                # Handle timeout specifically
                error_msg = f"Timeout after {field_timeout}s"
                verbose_print(f"[artists_fields_handler] TimeoutError for {artist} - {field}: {e}")
                error_value = {"error": "TimeoutError"}
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
            except Exception as e:
                # Extract error message, handling wrapped exceptions
                msg = str(e) or e.__class__.__name__
                # If the error message already contains artist/field, use it; otherwise add context
                if f"{artist} - {field}" not in msg:
                    msg = f"{msg} (for {artist} - {field})"
                verbose_print(f"[artists_fields_handler] Error for {artist} - {field}: {e}")
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
    
    except SerperCreditsExhausted:
        yield {"event": "error", "data": "Out of Serper Credits"}
        end_trace(trace_obj, "Fail")
    except Exception as e:
        # Provide a more user-friendly error message
        error_msg = str(e) or e.__class__.__name__
        # If the error message looks like a memory address or object ID, provide a generic message
        if error_msg.isdigit() and len(error_msg) > 8:
            error_msg = "A timeout or processing error occurred. Please try again."
        yield {"event": "error", "data": f"Error: {error_msg}"}
        end_trace(trace_obj, "Fail")
