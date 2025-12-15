"""Artists list extraction handler."""
import json
from typing import AsyncGenerator, Dict

from core.config import Config
from core.cache import build_cache_key, load_cache, save_cache
from core.prompts import build_extract_artists_prompt
from core.logging import start_trace, end_trace


async def artists_list_handler(event_data: Dict[str, str]) -> AsyncGenerator[Dict[str, str], None]:
    """
    Extract artist list from event data.
    Streams: {"event": "data", "data": "..."} where data is JSON array of artist names
    """
    # Parse no_cache - handle both bool and string "true"/"false"
    no_cache_raw = event_data.get("no_cache", False)
    if isinstance(no_cache_raw, str):
        no_cache = no_cache_raw.lower() in ("true", "1", "yes")
    else:
        no_cache = bool(no_cache_raw)
    
    print(f"[artists_list_handler] no_cache={no_cache}, type={type(no_cache)}, raw={no_cache_raw}")
    
    # Build cache key - initialize to None first to avoid scoping issues
    cache_key = None
    if not no_cache:
        try:
            cache_key = build_cache_key(event_data, "artists_list")
            cached = load_cache(cache_key)
            if cached and "artists" in cached:
                print(f"[cache] artists_list hit for key={cache_key}")
                yield {"event": "data", "data": json.dumps(cached["artists"])}
                return
        except Exception as e:
            print(f"[artists_list_handler] Error with cache: {e}")
            cache_key = None  # Continue without cache

    trace_obj = start_trace(["concert-artists-list", event_data.get('title', 'unknown')[:50]])

    try:
        # Use OpenAI SDK directly to avoid LangChain parse issues
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=Config.OPENAI_API_KEY)
        extract_prompt = build_extract_artists_prompt(event_data)

        completion = await client.chat.completions.create(
            model=Config.DETAILED_MODEL,
            messages=[{"role": "user", "content": extract_prompt}],
            max_tokens=Config.DETAILED_MAX_TOKENS,
            temperature=Config.TEMPERATURE,
            stream=False,
        )

        artist_list_text = completion.choices[0].message.content or ""

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

        # Cache the result only if we have a valid cache_key and not skipping cache
        if cache_key is not None and not no_cache:
            try:
                save_cache(cache_key, {"artists": artists})
            except Exception as e:
                print(f"[artists_list_handler] Error saving cache: {e}")
                # Non-fatal error, continue

        end_trace(trace_obj, "Success")

    except Exception as e:
        # Log full exception to help diagnose parsing/type errors
        import traceback
        error_msg = f"Error: {str(e)}"
        print(f"[artists_list_handler] Exception: {error_msg}")
        traceback.print_exc()
        yield {"event": "error", "data": error_msg}
        end_trace(trace_obj, "Fail")
