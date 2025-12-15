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
    cache_key = build_cache_key(event_data, "quick")
    cached = load_cache(cache_key)
    if cached and "quickSummary" in cached:
        print(f"[cache] quick hit for key={cache_key}")
        yield {"event": "data", "data": cached["quickSummary"]}
        return

    trace_obj = start_trace(["concert-quick", event_data.get('title', 'unknown')[:50]])

    try:
        llm = create_llm(
            model=Config.QUICK_MODEL,
            streaming=True,
            max_tokens=Config.QUICK_MAX_TOKENS,
            temperature=Config.TEMPERATURE
        )

        quick_prompt = build_quick_prompt(event_data)
        chain = ChatPromptTemplate.from_messages([("user", quick_prompt)]) | llm | StrOutputParser()

        quick_buffer = ""
        async for chunk in chain.astream({}):
            quick_buffer += chunk
            yield {"event": "data", "data": chunk}
        save_cache(cache_key, {"quickSummary": quick_buffer})

        end_trace(trace_obj, "Success")

    except Exception as e:
        yield {"event": "error", "data": f"Error: {str(e)}"}
        end_trace(trace_obj, "Fail")
