"""LLM setup and tool calling utilities."""
import re
import json
from typing import List, Dict, Any, Optional, Callable
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from langchain_core.tools import Tool
from core.config import Config


def verbose_print(*args, **kwargs):
    """Print only if verbose mode is enabled."""
    if Config.VERBOSE:
        print(*args, **kwargs)


class SerperCreditsExhausted(Exception):
    """Raised when Serper API returns 400 error indicating credits are exhausted."""
    pass


# Function definitions for OpenAI function calling
SEARCH_FUNCTION_DEF = {
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
}

FETCH_URL_FUNCTION_DEF = {
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
}

SPOTIFY_SEARCH_FUNCTION_DEF = {
    "type": "function",
    "function": {
        "name": "spotify_search_artist",
        "description": "Search Spotify for an artist by exact name. Input: artist name as a string. Returns the Spotify artist URL if an exact name match is found. Use this for finding Spotify links - it's more reliable than web search.",
        "parameters": {
            "type": "object",
            "properties": {
                "artist_name": {
                    "type": "string",
                    "description": "Artist name to search for"
                }
            },
            "required": ["artist_name"]
        }
    }
}

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


def _extract_tool_args(args: Any) -> Any:
    """Extract tool arguments, handling various formats from OpenAI."""
    if isinstance(args, dict):
        if '__arg1' in args:
            # OpenAI sometimes uses __arg1 for single positional args
            return args['__arg1']
        elif 'query' in args:
            # Explicit query parameter
            return args['query']
        else:
            # Try unpacking all args
            return args
    return args


def _call_tool(tool_func: Callable, args: Any, debug: bool = False) -> str:
    """Call a tool function with extracted arguments."""
    try:
        extracted_args = _extract_tool_args(args)
        
        if isinstance(extracted_args, dict):
            result = tool_func(**extracted_args)
        else:
            result = tool_func(extracted_args)
        
        if debug:
            result_preview = result[:100] + "..." if len(str(result)) > 100 else result
            verbose_print(f"    Result: {result_preview}")
        
        return str(result)
    except Exception as e:
        error_str = str(e)
        
        # Check if this is a Serper credits error
        if _is_serper_credits_error(e):
            raise SerperCreditsExhausted("Out of Serper Credits")
        
        if debug:
            verbose_print(f"    Error: {e}")
        
        return f"(tool error: {e})"


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
        
        tool_calls = getattr(resp, "tool_calls", None)
        if not tool_calls:
            # Final content - no more tool calls
            return resp.content if isinstance(resp.content, str) else str(resp.content)
        
        if debug:
            verbose_print(f"\n🔧 Tool calls detected: {len(tool_calls)}")
            for i, call in enumerate(tool_calls, 1):
                name = call.get("name")
                args = call.get("args") or {}
                args_str = json.dumps(args, indent=2) if isinstance(args, dict) else str(args)
                verbose_print(f"  {i}. {name}({args_str})")
        
        for call in tool_calls:
            name = call.get("name")
            args = call.get("args") or {}
            
            if debug:
                verbose_print(f"  - Executing: {name}")
            
            if name not in tool_map:
                messages.append(ToolMessage(
                    content="(tool not available)",
                    tool_call_id=call.get("id")
                ))
                continue
            
            tool_func = tool_map[name].func
            result = _call_tool(tool_func, args, debug)
            
            messages.append(ToolMessage(
                content=result,
                tool_call_id=call.get("id")
            ))


def _build_function_definitions(has_search: bool, tools: List[Tool] = None) -> List[Dict[str, Any]]:
    """Build OpenAI function definitions based on available tools."""
    functions = []
    
    if has_search and Config.SERPER_API_KEY:
        functions.append(SEARCH_FUNCTION_DEF)
    
    functions.append(FETCH_URL_FUNCTION_DEF)
    
    # Only include Spotify function if Spotify tool is in the tools list
    if tools and any(t.name == "spotify_search_artist" for t in tools):
        functions.append(SPOTIFY_SEARCH_FUNCTION_DEF)
    
    return functions


def _is_serper_credits_error(error: Exception) -> bool:
    """Check if an error is a Serper credits exhaustion error."""
    error_str = str(error)
    return "400" in error_str and ("serper" in error_str.lower() or "google.serper.dev" in error_str.lower())


def _execute_search_tool(query: str, has_search: bool) -> str:
    """Execute the search tool and return result or fallback message."""
    from langchain_community.utilities import GoogleSerperAPIWrapper
    
    if not has_search or not Config.SERPER_API_KEY:
        return f"Web search unavailable. Please provide your best answer based on your training data about: {query}"
    
    try:
        serper = GoogleSerperAPIWrapper(serper_api_key=Config.SERPER_API_KEY)
        result = serper.run(query)
        
        # Log search results for debugging
        result_preview = str(result)[:500] if result else "(empty)"
        verbose_print(f"[run_json_prompt] Search result for '{query}': {result_preview}...")
        
        if not result or len(str(result)) < 10:
            return f"Search returned no useful results for '{query}'. Please provide your best answer based on your training data."
        
        return result
    except Exception as e:
        error_str = str(e)
        verbose_print(f"[run_json_prompt] Search error for query '{query}': {e}")
        
        if _is_serper_credits_error(e):
            raise SerperCreditsExhausted("Out of Serper Credits")
        
        return f"Web search unavailable. Please provide your best answer based on your training data about: {query}"


def _execute_fetch_url_tool(url: str) -> str:
    """Execute the fetch_url tool and return result or fallback message."""
    from core.tools import fetch_url_content
    
    try:
        return fetch_url_content(url)
    except Exception as e:
        verbose_print(f"[run_json_prompt] Fetch URL error for '{url}': {e}")
        return f"URL fetch failed: {str(e)}. Please provide your best answer based on your training data."


def _execute_tool_call(tool_call: Any, has_search: bool) -> str:
    """Execute a single tool call and return the result."""
    import json as json_lib
    from core.tools import spotify_search_artist
    
    function_name = tool_call.function.name
    args = json_lib.loads(tool_call.function.arguments)
    
    if function_name == "search":
        return _execute_search_tool(args["query"], has_search)
    elif function_name == "fetch_url":
        return _execute_fetch_url_tool(args["url"])
    elif function_name == "spotify_search_artist":
        artist_name = args.get("artist_name", "")
        result = spotify_search_artist(artist_name)
        # Log Spotify search results for debugging
        verbose_print(f"[run_json_prompt] Spotify search result for '{artist_name}': {result[:300]}...")
        return result
    else:
        return f"Error: Unknown function {function_name}"


def _extract_json_from_text(text: str) -> Optional[Dict[str, Any]]:
    """Extract JSON object from text, handling markdown code blocks."""
    if not text:
        return None
    
    # Try direct JSON parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    
    # Try extracting JSON from markdown code blocks
    cleaned_text = text.strip('`\n ')
    try:
        return json.loads(cleaned_text)
    except json.JSONDecodeError:
        pass
    
    # Try regex extraction
    match = re.search(r"\{.*\}", text, re.S)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    
    return None


def _build_tool_call_message(message: Any) -> Dict[str, Any]:
    """Build a message dict with tool calls from an OpenAI message object."""
    return {
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
    }


def _build_tool_result_message(tool_call_id: str, result: str) -> Dict[str, Any]:
    """Build a tool result message dict."""
    return {
        "role": "tool",
        "tool_call_id": tool_call_id,
        "content": str(result)
    }


async def run_json_prompt(
    prompt_text: str,
    tools: List[Tool],
    has_search: bool,
    query_description: str = None
) -> Dict[str, Any]:
    """
    Run a JSON-format prompt with OpenAI function calling support.
    Uses OpenAI's native function calling API for reliable tool usage.
    
    Args:
        prompt_text: The prompt to send to the LLM
        tools: List of available tools
        has_search: Whether search tool is available
        query_description: Optional description for logging (e.g., "YouTube URL for Artist Name")
    """
    from openai import AsyncOpenAI

    # Log query start (non-verbose)
    if query_description:
        print(f"  → Querying LLM: {query_description}")
    elif not Config.VERBOSE:
        # Extract a short description from prompt if available
        prompt_preview = prompt_text[:60].replace('\n', ' ')
        print(f"  → Querying LLM: {prompt_preview}...")

    client = AsyncOpenAI(api_key=Config.OPENAI_API_KEY)
    functions = _build_function_definitions(has_search, tools)
    messages = [{"role": "user", "content": prompt_text}]
    
    try:
        # Initial completion with function calling enabled
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
        
        # Log tool call status with details (verbose only)
        if tool_calls:
            verbose_print(f"[run_json_prompt] Model requested {len(tool_calls)} tool call(s):")
            for i, tc in enumerate(tool_calls, 1):
                function_name = tc.function.name
                try:
                    args = json.loads(tc.function.arguments)
                    verbose_print(f"  {i}. {function_name}({json.dumps(args, indent=2)})")
                except json.JSONDecodeError:
                    verbose_print(f"  {i}. {function_name}({tc.function.arguments})")
        else:
            content_preview = message.content[:100] if message.content else 'None'
            verbose_print(f"[run_json_prompt] No tool calls, model response: {content_preview}")
        
        # Handle tool calls loop
        max_tool_iterations = 5
        iteration = 0
        
        while tool_calls and iteration < max_tool_iterations:
            iteration += 1
            
            # Add assistant message with tool calls
            messages.append(_build_tool_call_message(message))
            
            # Execute all tool calls and add results
            for tool_call in message.tool_calls:
                result = _execute_tool_call(tool_call, has_search)
                # Log tool result for debugging (verbose only)
                result_preview = str(result)[:300] if result else "(empty)"
                verbose_print(f"[run_json_prompt] Tool result for {tool_call.function.name}: {result_preview}...")
                messages.append(_build_tool_result_message(tool_call.id, result))
            
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
        
        # Extract and parse final JSON response
        raw = message.content or ""
        if not raw:
            verbose_print(f"[run_json_prompt] Empty response from model after tool calls")
            return {"error": "Empty response from model"}
        
        verbose_print(f"[run_json_prompt] Final response: {raw[:200]}")
        parsed = _extract_json_from_text(raw)
        
        if parsed is not None:
            return parsed
        
        return {"error": "Failed to parse JSON response"}
        
    except SerperCreditsExhausted:
        raise
    except Exception as e:
        # Try to salvage JSON from message content if available
        raw = ""
        if 'message' in locals():
            raw = getattr(message, 'content', '') or ""
        
        parsed = _extract_json_from_text(raw)
        if parsed is not None:
            return parsed
        
        error_msg = str(e) or e.__class__.__name__
        verbose_print(f"[run_json_prompt] Error parsing response: {error_msg}")
        if Config.VERBOSE:
            import traceback
            traceback.print_exc()
        return {"error": error_msg}
