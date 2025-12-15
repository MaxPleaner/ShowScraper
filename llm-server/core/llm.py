"""LLM setup and tool calling utilities."""
import re
import json
from typing import List, Dict, Any, Optional
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from langchain_core.tools import Tool
from core.config import Config


def create_llm(
    model: str = None,
    streaming: bool = False,
    max_tokens: int = None,
    temperature: float = None
) -> ChatOpenAI:
    """Create a configured ChatOpenAI instance."""
    return ChatOpenAI(
        model=model or Config.DETAILED_MODEL,
        openai_api_key=Config.OPENAI_API_KEY,
        streaming=streaming,
        max_tokens=max_tokens or Config.DETAILED_MAX_TOKENS,
        temperature=temperature or Config.TEMPERATURE,
    )


async def run_with_tools(
    llm: ChatOpenAI,
    tools: List[Tool],
    prompt: str,
    debug: bool = False
) -> str:
    """Minimal tool-calling loop for ChatOpenAI with LangChain tool schema."""
    tool_map = {t.name: t for t in tools}
    messages: List = [HumanMessage(content=prompt)]

    # Bind tools to LLM to avoid AgentOps conflicts
    llm_with_tools = llm.bind_tools(tools) if tools else llm

    while True:
        resp: AIMessage = await llm_with_tools.ainvoke(messages)
        messages.append(resp)
        if getattr(resp, "tool_calls", None):
            if debug:
                print(f"\n🔧 Tool calls detected: {len(resp.tool_calls)}")
            for call in resp.tool_calls:
                name = call.get("name")
                args = call.get("args") or {}
                if debug:
                    print(f"  - Calling: {name}({args})")
                if name not in tool_map:
                    messages.append(ToolMessage(content="(tool not available)", tool_call_id=call.get("id")))
                    continue
                try:
                    # Handle both dict args and __arg1 positional arg
                    if isinstance(args, dict):
                        if '__arg1' in args:
                            # OpenAI sometimes uses __arg1 for single positional args
                            result = tool_map[name].func(args['__arg1'])
                        elif 'query' in args:
                            # Explicit query parameter
                            result = tool_map[name].func(args['query'])
                        else:
                            # Try unpacking all args
                            result = tool_map[name].func(**args)
                    else:
                        result = tool_map[name].func(args)
                    if debug:
                        print(f"    Result: {result[:100]}..." if len(str(result)) > 100 else f"    Result: {result}")
                except Exception as e:
                    result = f"(tool error: {e})"
                    if debug:
                        print(f"    Error: {e}")
                messages.append(ToolMessage(content=str(result), tool_call_id=call.get("id")))
            continue
        # Final content
        return resp.content if isinstance(resp.content, str) else str(resp.content)


async def run_json_prompt(
    prompt_text: str,
    tools: List[Tool],
    has_search: bool
) -> Dict[str, Any]:
    """Run a short JSON-format prompt with tools and return parsed dict or {'error': ...}."""
    llm_dp = create_llm(
        model=Config.QUICK_MODEL,
        streaming=False,
        max_tokens=512,
        temperature=Config.TEMPERATURE_STRICT
    )
    raw = ""
    try:
        tool_hint = "\n\nTools available: search (web), fetch_url (HTML fetch). Use them when unsure."
        no_search_hint = "\n\nNote: web search tool is unavailable in this environment; rely on known data."
        prompt_with_hint = prompt_text + (tool_hint if has_search else no_search_hint)
        raw = await run_with_tools(llm_dp, tools, prompt_with_hint)
        return json.loads(raw)
    except Exception as e:
        # Try to salvage a JSON object from the text
        def _extract_json(text: str):
            m = re.search(r"\{.*\}", text, re.S)
            if m:
                try:
                    return json.loads(m.group(0))
                except Exception:
                    return None
            return None
        parsed = _extract_json(raw) or _extract_json(raw.strip('`\n ')) or None
        if parsed is not None:
            return parsed
        msg = str(e) or e.__class__.__name__
        return {"error": msg}
