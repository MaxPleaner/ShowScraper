"""Quick research handler - fast streaming summary."""
from typing import AsyncGenerator, Dict
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from core.config import Config
from core.cache import build_cache_key, load_cache, save_cache
from core.prompts import build_quick_prompt
from core.llm import create_llm
from core.logging import start_trace, end_trace


async def quick_research_handler(event_data: Dict[str, str]) -> AsyncGenerator[Dict[str, str], None]:
    """
    Quick mode: single streaming LLM call, no tools, 2-3 sentence summary.
    Events: {"event": "data", "data": "...streaming text chunk..."}
    """
    # Parse no_cache - handle both bool and string "true"/"false"
    no_cache_raw = event_data.get("no_cache", False)
    if isinstance(no_cache_raw, str):
        no_cache = no_cache_raw.lower() in ("true", "1", "yes")
    else:
        no_cache = bool(no_cache_raw)
    
    print(f"[quick_handler] no_cache={no_cache}, type={type(no_cache)}, raw={no_cache_raw}")
    
    # Build cache key - initialize to None first to avoid scoping issues
    cache_key = None
    try:
        cache_key = build_cache_key(event_data, "quick")
    except Exception as e:
        print(f"[quick_handler] Error building cache key: {e}")
        cache_key = None  # Explicitly set to None on error
    
    # Check cache only if not skipping and we have a valid key
    if not no_cache and cache_key is not None:
        try:
            cached = load_cache(cache_key)
            if cached and "quickSummary" in cached:
                print(f"[cache] quick hit for key={cache_key}")
                yield {"event": "data", "data": cached["quickSummary"]}
                return
        except Exception as e:
            print(f"[quick_handler] Error loading cache: {e}")
            # Continue to fetch fresh data
    else:
        if no_cache:
            print(f"[quick_handler] Skipping cache due to no_cache=True, will fetch fresh data")
        else:
            print(f"[quick_handler] No cache key available, will fetch fresh data")

    trace_obj = start_trace(["concert-quick", event_data.get('title', 'unknown')[:50]])

    try:
        llm = create_llm(
            model=Config.QUICK_MODEL,
            streaming=True,
            max_tokens=Config.QUICK_MAX_TOKENS,
            temperature=Config.TEMPERATURE
        )

        quick_prompt = build_quick_prompt(event_data)
        
        # Use OpenAI SDK directly to avoid LangChain async context manager bug
        from openai import AsyncOpenAI
        
        client = AsyncOpenAI(api_key=Config.OPENAI_API_KEY)
        quick_buffer = ""
        
        # Stream directly from OpenAI API
        stream = await client.chat.completions.create(
            model=Config.QUICK_MODEL,
            messages=[{"role": "user", "content": quick_prompt}],
            max_tokens=Config.QUICK_MAX_TOKENS,
            temperature=Config.TEMPERATURE,
            stream=True
        )
        
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                quick_buffer += content
                yield {"event": "data", "data": content}
        
        # Only save to cache if we have a valid cache_key and not skipping cache
        if cache_key is not None and not no_cache:
            try:
                save_cache(cache_key, {"quickSummary": quick_buffer})
            except Exception as e:
                print(f"[quick_handler] Error saving cache: {e}")
                # Non-fatal error, continue

        end_trace(trace_obj, "Success")

    except Exception as e:
        error_msg = str(e)
        print(f"[quick_handler] Exception: {error_msg}")
        import traceback
        traceback.print_exc()
        yield {"event": "error", "data": f"Error: {error_msg}"}
        end_trace(trace_obj, "Fail")
