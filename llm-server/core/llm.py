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
    """
    Run a short JSON-format prompt (no tool calls) and return parsed dict or {'error': ...}.
    Uses the detailed model directly to avoid LangChain/tool parsing issues.
    """
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=Config.OPENAI_API_KEY)
    raw = ""
    try:
        hint = (
            "\n\nTools may be available (search/fetch). "
            "Even if unsure, return your best factual guess. "
            "Never return empty values; use 'unknown' strings instead of omitting keys."
        )
        prompt_with_hint = prompt_text + hint

        completion = await client.chat.completions.create(
            model=Config.DETAILED_MODEL,
            messages=[{"role": "user", "content": prompt_with_hint}],
            max_tokens=512,
            temperature=Config.TEMPERATURE_STRICT,
            stream=False,
        )
        raw = completion.choices[0].message.content or ""
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
        print(f"[run_json_prompt] Error parsing response: {msg}")
        return {"error": msg}
