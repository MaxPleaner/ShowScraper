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


class SerperCreditsExhausted(Exception):
    """Raised when Serper API returns 400 error indicating credits are exhausted."""
    pass


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
                    error_str = str(e)
                    # Check if this is a 400 error from Serper (out of credits)
                    if name == "search" and "400" in error_str and ("serper" in error_str.lower() or "google.serper.dev" in error_str.lower()):
                        raise SerperCreditsExhausted("Out of Serper Credits")
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
    Run a JSON-format prompt with OpenAI function calling support.
    Uses OpenAI's native function calling API for reliable tool usage.
    """
    from openai import AsyncOpenAI
    from core.tools import fetch_url_content
    from langchain_community.utilities import GoogleSerperAPIWrapper

    client = AsyncOpenAI(api_key=Config.OPENAI_API_KEY)
    
    # Build OpenAI function definitions
    functions = []
    if has_search and Config.SERPER_API_KEY:
        functions.append({
            "type": "function",
            "function": {
                "name": "search",
                "description": "Search the web for info about artists, events, venues. Input: a search query string.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Search query string"
                        }
                    },
                    "required": ["query"]
                }
            }
        })
    
    # Always include fetch_url
    functions.append({
        "type": "function",
        "function": {
            "name": "fetch_url",
            "description": "Fetch and extract text content from a URL. Input: a URL string. Returns the page content as text. Note: foopee.com URLs will fail (use search instead).",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "URL to fetch"
                    }
                },
                "required": ["url"]
            }
        }
    })
    
    messages = [{"role": "user", "content": prompt_text}]
    
    try:
        # Call with function calling enabled
        completion = await client.chat.completions.create(
            model=Config.DETAILED_MODEL,
            messages=messages,
            tools=functions if functions else None,
            tool_choice="auto" if functions else None,
            max_tokens=512,
            temperature=Config.TEMPERATURE_STRICT,
        )
        
        message = completion.choices[0].message
        
        # Log if we got tool calls
        tool_calls = getattr(message, 'tool_calls', None)
        if tool_calls:
            print(f"[run_json_prompt] Model requested {len(tool_calls)} tool call(s)")
        else:
            print(f"[run_json_prompt] No tool calls, model response: {message.content[:100] if message.content else 'None'}")
        
        # Handle tool calls (tool_calls can be None or a list)
        max_tool_iterations = 5  # Prevent infinite loops
        iteration = 0
        while tool_calls and iteration < max_tool_iterations:
            iteration += 1
            # Add the assistant message with tool_calls to messages first
            messages.append({
                "role": "assistant",
                "content": message.content,
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments
                        }
                    }
                    for tc in message.tool_calls
                ]
            })
            
            # Execute tool calls
            for tool_call in message.tool_calls:
                function_name = tool_call.function.name
                import json as json_lib
                args = json_lib.loads(tool_call.function.arguments)
                
                if function_name == "search" and has_search and Config.SERPER_API_KEY:
                    try:
                        serper = GoogleSerperAPIWrapper(serper_api_key=Config.SERPER_API_KEY)
                        result = serper.run(args["query"])
                        if not result or len(str(result)) < 10:
                            result = f"Search returned no useful results for '{args.get('query', '')}'. Please provide your best answer based on your training data."
                    except Exception as e:
                        error_str = str(e)
                        print(f"[run_json_prompt] Search error for query '{args.get('query', '')}': {e}")
                        # Check if this is a 400 error from Serper (out of credits)
                        if "400" in error_str and ("serper" in error_str.lower() or "google.serper.dev" in error_str.lower()):
                            raise SerperCreditsExhausted("Out of Serper Credits")
                        # On other search failures, tell model to use its knowledge
                        result = f"Web search unavailable. Please provide your best answer based on your training data about: {args.get('query', '')}"
                elif function_name == "fetch_url":
                    try:
                        result = fetch_url_content(args["url"])
                    except Exception as e:
                        print(f"[run_json_prompt] Fetch URL error for '{args.get('url', '')}': {e}")
                        result = f"URL fetch failed: {str(e)}. Please provide your best answer based on your training data."
                else:
                    result = f"Error: Unknown function {function_name}"
                
                # Add tool result to messages
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": str(result)
                })
            
            # Get next completion
            completion = await client.chat.completions.create(
                model=Config.DETAILED_MODEL,
                messages=messages,
                tools=functions if functions else None,
                tool_choice="auto" if functions else None,
                max_tokens=512,
                temperature=Config.TEMPERATURE_STRICT,
            )
            message = completion.choices[0].message
            tool_calls = getattr(message, 'tool_calls', None)
        
        # Extract final JSON response
        raw = message.content or ""
        if not raw:
            print(f"[run_json_prompt] Empty response from model after tool calls")
            return {"error": "Empty response from model"}
        
        print(f"[run_json_prompt] Final response: {raw[:200]}")
        return json.loads(raw)
    except Exception as e:
        # Try to salvage a JSON object from the text
        raw = ""
        if 'message' in locals():
            raw = getattr(message, 'content', '') or ""
        
        def _extract_json(text: str):
            if not text:
                return None
            m = re.search(r"\{.*\}", text, re.S)
            if m:
                try:
                    return json.loads(m.group(0))
                except Exception:
                    return None
            return None
        parsed = _extract_json(raw) or (_extract_json(raw.strip('`\n ')) if raw else None) or None
        if parsed is not None:
            return parsed
        msg = str(e) or e.__class__.__name__
        print(f"[run_json_prompt] Error parsing response: {msg}")
        import traceback
        traceback.print_exc()
        return {"error": msg}
