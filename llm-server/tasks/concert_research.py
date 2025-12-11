import os
import re
import asyncio
import json
import ipaddress
import socket
import hashlib
from urllib.parse import urlparse
from typing import AsyncGenerator, Optional, List
from datetime import datetime
from pathlib import Path
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from langchain_core.tools import Tool
from langchain_community.utilities import GoogleSerperAPIWrapper
from langchain_community.document_loaders import WebBaseLoader
import urllib.request
import urllib.error
import agentops

CACHE_DIR = Path(__file__).resolve().parent / "logs" / "cache"


def _normalize_cache_field(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def build_cache_key(event_data: dict, mode: str) -> str:
    base = "|".join([
        _normalize_cache_field(event_data.get("date", "")),
        _normalize_cache_field(event_data.get("venue", "")),
        _normalize_cache_field(event_data.get("title", "")),
        mode.lower().strip(),
    ])
    return hashlib.sha256(base.encode("utf-8")).hexdigest()


def _cache_path(cache_key: str) -> Path:
    path = (CACHE_DIR / f"{cache_key}.json").resolve()
    # Ensure the resolved path stays within the cache directory to avoid traversal
    resolved_cache = CACHE_DIR.resolve()
    if resolved_cache not in path.parents and path != resolved_cache:
        raise ValueError("Invalid cache path")
    return path


def _extract_trace_id(trace_obj) -> Optional[str]:
    try:
        span = getattr(trace_obj, "span", None)
        if span and hasattr(span, "get_span_context"):
            ctx = span.get_span_context()
            trace_id = getattr(ctx, "trace_id", None)
            if trace_id:
                return str(trace_id)
    except Exception:
        pass
    return None


def log_trace_cost(trace_obj):
    """Best-effort: fetch trace cost via AgentOps Public API and print it."""
    api_key = os.getenv("AGENTOPS_API_KEY")
    trace_id = _extract_trace_id(trace_obj)
    if not api_key or not trace_id:
        return

    def _post_json(url: str, payload: dict) -> dict:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def _get_json(url: str, token: str) -> dict:
        req = urllib.request.Request(
            url,
            headers={"Authorization": f"Bearer {token}"},
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode("utf-8"))

    try:
        token_resp = _post_json(
            "https://api.agentops.ai/public/v1/auth/access_token",
            {"api_key": api_key},
        )
        access_token = token_resp.get("access_token")
        if not access_token:
            return

        metrics = _get_json(
            f"https://api.agentops.ai/public/v1/traces/{trace_id}/metrics",
            access_token,
        )
        total_cost = (
            metrics.get("cost", {}).get("total")
            if isinstance(metrics, dict)
            else None
        )
        if total_cost is not None:
            print(f"[agentops] trace {trace_id} cost=${total_cost}")
    except Exception:
        # Silent failure to avoid impacting request flow
        return


def load_cache(cache_key: str) -> Optional[dict]:
    try:
        path = _cache_path(cache_key)
        if not path.exists():
            return None
        data = json.loads(path.read_text())
        if data.get("key") != cache_key:
            return None
        return data
    except Exception:
        return None


def save_cache(cache_key: str, payload: dict):
    try:
        path = _cache_path(cache_key)
        path.parent.mkdir(parents=True, exist_ok=True)
        payload_with_meta = {
            **payload,
            "key": cache_key,
            "cached_at": datetime.utcnow().isoformat() + "Z",
        }
        tmp_path = path.with_suffix(".tmp")
        tmp_path.write_text(json.dumps(payload_with_meta, indent=2))
        tmp_path.replace(path)
    except Exception:
        pass

def _is_safe_url(url: str) -> tuple[bool, str]:
    """
    Validate URL to prevent SSRF attacks.
    Returns (is_safe, error_message)
    """
    try:
        parsed = urlparse(url)

        # Only allow HTTP/HTTPS
        if parsed.scheme not in ('http', 'https'):
            return False, f"Invalid protocol: {parsed.scheme}. Only HTTP/HTTPS allowed."

        # Must have a hostname
        if not parsed.hostname:
            return False, "Invalid URL: no hostname found."

        # Resolve hostname to IP
        try:
            ip = socket.gethostbyname(parsed.hostname)
        except socket.gaierror:
            return False, f"Cannot resolve hostname: {parsed.hostname}"

        # Check if IP is private/reserved
        try:
            ip_obj = ipaddress.ip_address(ip)

            # Block private networks
            if ip_obj.is_private:
                return False, f"Blocked private IP address: {ip}"

            # Block loopback
            if ip_obj.is_loopback:
                return False, f"Blocked loopback address: {ip}"

            # Block link-local
            if ip_obj.is_link_local:
                return False, f"Blocked link-local address: {ip}"

            # Block multicast
            if ip_obj.is_multicast:
                return False, f"Blocked multicast address: {ip}"

            # Block reserved
            if ip_obj.is_reserved:
                return False, f"Blocked reserved address: {ip}"

        except ValueError:
            return False, f"Invalid IP address: {ip}"

        return True, ""

    except Exception as e:
        return False, f"URL validation error: {str(e)}"

def fetch_url_content(url: str) -> str:
    """Fetch and extract text content from a URL with SSRF protection"""
    try:
        # Validate URL for SSRF protection
        is_safe, error_msg = _is_safe_url(url)
        if not is_safe:
            return f"Error: {error_msg}"

        # Don't fetch foopee.com URLs (they block scrapers)
        if 'foopee.com' in url.lower():
            return "Error: foopee.com blocks web scrapers. Please use web search instead."

        loader = WebBaseLoader(url)
        docs = loader.load()

        if not docs:
            return f"Error: Could not load content from {url}"

        # Combine all document content
        content = '\n\n'.join([doc.page_content for doc in docs])

        # Truncate if too long (keep first 8000 chars)
        if len(content) > 8000:
            content = content[:8000] + "\n\n[Content truncated...]"

        return content
    except Exception as e:
        return f"Error fetching URL: {str(e)}"

def build_quick_prompt(event_data: dict) -> str:
    """Build quick summary prompt - fast, streaming, no tools needed"""
    prompt = f"""Describe this concert in 2-4 sentences for someone deciding whether to attend.

Event:
- Title: {event_data['title']}
- Venue: {event_data['venue']}
- Date: {event_data['date']}

Focus on:
- Artists/performers: what they're known for, genre/style, notable works
- Factual venue details: capacity, location type (if known)

Guidelines:
- Be concise and factual - relay information, don't sell the event
- Only include information you're confident about from your training data
- Do NOT make up genres, bios, or details you're unsure about
- NO FLUFF: Avoid words like "immersive", "energetic", "vibrant", "dynamic", "exciting", "unforgettable", "experience", "atmosphere", "vibe"
- Don't hype the venue or event - just state facts
- If you don't recognize the artists, say so clearly rather than speculating
- Omit information rather than guessing
"""
    return prompt

def build_extract_artists_prompt(event_data: dict) -> str:
    """Phase 1: Extract list of performing artists"""

    # Check if URL is from foopee.com
    is_foopee = 'foopee.com' in event_data.get('url', '').lower()
    has_url = event_data.get('url', '').strip() != ''

    prompt = f"""Extract the list of artists/performers at this event.

Event:
- Title: {event_data['title']}
- Venue: {event_data['venue']}
- Date: {event_data['date']}
- Event URL: {event_data['url']}

Instructions:
1. First, try to extract artist names from the event title
2. If artists aren't clear from the title:"""

    if is_foopee:
        prompt += f"""
   - NOTE: This event is from foopee.com (blocks URL fetching)
   - Use the search tool to find: "{event_data['title']} {event_data['venue']} {event_data['date']}"
   - Look for artist lineup in the search results"""
    elif has_url:
        prompt += f"""
   - Use the fetch_url tool to load the event page: {event_data['url']}
   - The page content should contain the list of artists performing
   - Extract all artist names from the page content
   - If URL fetch fails, fallback to search tool: "{event_data['title']} {event_data['venue']}\""""
    else:
        prompt += f"""
   - Use the search tool to find: "{event_data['title']} {event_data['venue']} {event_data['date']}"
   - Look for artist lineup in the search results"""

    prompt += """

Output format:
Return ONLY a simple list of artist names, one per line, no numbering, no bullets, no extra text.
Just the artist names, nothing else.

Example output:
Radiohead
Phoebe Bridgers
The National

If you cannot find any artists, return:
Unable to determine artists
"""
    return prompt

def build_artist_details_prompt(artists: list[str]) -> str:
    """DEPRECATED: Phase 2 batch mode - replaced by build_single_artist_prompt"""
    artists_str = '\n'.join(artists)

    prompt = f"""Get details for each of these artists:

{artists_str}

For each artist, output:

### Artist Name
- **YouTube**: [Search on YouTube](https://www.youtube.com/results?search_query=Artist+Name) (replace spaces with +)
- **Link**: [Platform Name](url) - OPTIONAL: Include ONE additional link if found (see guidelines)
- **Genres**: Key genres/subgenres
- **Bio**: Single concise line with notable hook; no fluff words

Guidelines:
- **YouTube link**: Format as markdown link: [Search on YouTube](url) where url is the search query
- **Link (optional)**: Include ONE additional link if you can find it via web search:
  - Priority order: Instagram > Bandcamp > SoundCloud > Personal Website
  - **Search strategy**: Use web search to find "{{Artist Name}} website" or "{{Artist Name}} instagram" or "{{Artist Name}} bandcamp"
  - **Personal websites**: Look for official artist websites in search results (often appear in first few results)
  - Format as markdown: [Instagram](url) or [Bandcamp](url) or [SoundCloud](url) or [Website](url)
  - Only include if you can verify it's the correct artist
  - If no additional link found, omit this line entirely (don't write "Link: (not found)")
  - NEVER include more than one additional link
  - **Important**: Check search results thoroughly - personal websites are often the first result
- **Genres**: Use web search to find the artist's genres
  - Extract genres from any information you find (bio, descriptions, articles)
  - If the bio mentions genre terms (e.g., "house music", "R&B singer", "rock band"), extract those into Genres field
  - Examples: "House, Dance", "R&B, Soul", "Alternative Rock"
- **Bio**: Use web search to find key information about the artist (one concise line)
  - Include notable details: origin, style, achievements, notable works
  - You can mention genre in bio too, but MUST also fill Genres field separately
- **IMPORTANT**: If you find genre information anywhere (bio, search results, etc.), extract it to the Genres field
  - Only mark "(not found)" if you truly cannot determine any genre from any source
- If you cannot find trustworthy info for an artist via web search:
  ### Artist Name
  - **YouTube**: [Search on YouTube](https://www.youtube.com/results?search_query=Artist+Name)
  - **Genres**: (not found)
  - **Bio**: (not found)
- Do NOT make up links, genres, or bios
- Cross-check that information matches the correct artist name
- No fluff words like "immersive", "energetic", "vibrant"

Output ONLY the artist list with details. No introduction, no overview, no venue info.
"""
    return prompt

def build_single_artist_prompt(artist: str) -> str:
    """Phase 2: Get details for a single artist (parallel mode)"""

    prompt = f"""Get details for this artist: {artist}

Output format:

### {artist}
- **YouTube**: [Search on YouTube](https://www.youtube.com/results?search_query=Artist+Name) (replace spaces with +)
- **Link**: [Platform Name](url) - OPTIONAL: Include ONE additional link if found (see guidelines)
- **Genres**: Key genres/subgenres
- **Bio**: Single concise line with notable hook; no fluff words

Guidelines:
- **Search strategy**: When researching, start with: "{artist} band" - this yields better results for musical artists
- **YouTube link**: Format as markdown link: [Search on YouTube](url) where url is the search query with artist name
- **Link (optional)**: Include ONE additional link if you can find it via web search:
  - Priority order: Instagram > Bandcamp > SoundCloud > Personal Website
  - **Search queries**: Try "{artist} band website", "{artist} band instagram", "{artist} band bandcamp"
  - **Personal websites**: Look for official artist websites in search results (often appear in first few results)
  - Format as markdown: [Instagram](url) or [Bandcamp](url) or [SoundCloud](url) or [Website](url)
  - Only include if you can verify it's the correct artist
  - If no additional link found, omit this line entirely (don't write "Link: (not found)")
  - NEVER include more than one additional link
  - **Important**: Check search results thoroughly - personal websites are often the first result
- **Genres**: Use web search (try "{artist} band genre") to find the artist's genres
  - Extract genres from any information you find (bio, descriptions, articles)
  - If the bio mentions genre terms (e.g., "house music", "R&B singer", "rock band"), extract those into Genres field
  - Examples: "House, Dance", "R&B, Soul", "Alternative Rock"
- **Bio**: Use web search (try "{artist} band") to find key information about the artist (one concise line)
  - Include notable details: origin, style, achievements, notable works
  - You can mention genre in bio too, but MUST also fill Genres field separately
- **IMPORTANT**: If you find genre information anywhere (bio, search results, etc.), extract it to the Genres field
  - Only mark "(not found)" if you truly cannot determine any genre from any source
- If you cannot find trustworthy info via web search:
  ### {artist}
  - **YouTube**: [Search on YouTube](https://www.youtube.com/results?search_query={artist.replace(' ', '+')})
  - **Genres**: (not found)
  - **Bio**: (not found)
- Do NOT make up links, genres, or bios
- Cross-check that information matches the correct artist name
- No fluff words like "immersive", "energetic", "vibrant"

Output ONLY the artist section with details. No introduction, no extra text.
"""
    return prompt

def build_editor_prompt(event_data: dict) -> str:
    """DEPRECATED: Old two-pass editor - no longer used in new workflow"""
    artists = parse_artists(event_data['title'])
    artists_str = ', '.join(artists)

    prompt = f"""You are the editor/verifier. You receive (a) the original instructions and (b) the draft result. Produce the final markdown only; do NOT restate instructions.

Event:
- Date: {event_data['date']}
- Venue: {event_data['venue']}
- Artists: {artists_str}
- Event URL: {event_data['url']}

Draft markdown (from another agent):
{{{{draft}}}}

Fixes to apply:
- No fluff into the "Overview"! Do not make it sound like an advertisement! We are just relating impartial information.
- Follow the original instructions; do not repeat them in the output. Keep exactly two sections: Overview and Artists.
- Overview must include:
  * Brief explanation of the show's genre/style
  * Brief explanation of the venue: capacity/size, typical crowd atmosphere (moshing, dancing, passive listening, seated, upscale, dive bar, punk venue, etc.)
  * Additional context ONLY if confirmed (tour leg, festival, after-party) - absolutely NO speculative language like "potentially", "might be", "expect", etc.
  * REMOVE all fluff words: "immersive", "energetic", "vibrant", "dynamic", etc.
  * If information is unknown, omit it entirely - do not speculate.
- For every artist in the list above: create an `h3` heading (### Artist Name) and ensure three bullets exist (Links, Genres, Bio). If links missing, add at least one YouTube performance link + one social (Instagram preferred). If unknown, mark “(info not found)” but keep the bullet. Do NOT make up genres/bios—only include if you find trustworthy, correctly-matched info.
- Genres bullet is required and should be concise.
- Bios: single concise line with notable hook; no fluff.
- Keep markdown headings/bullets compact, minimal spacing; no added intro/outro text.
- Do NOT use code fences or inline code blocks around the whole answer; return plain markdown content.
Return the final markdown only."""
    return prompt

async def quick_research_handler(event_data: dict) -> AsyncGenerator[dict, None]:
    """
    Quick mode: single streaming LLM call, no tools, 2-3 sentence summary.
    Events: {"event": "quick", "data": "...streaming text..."}
    """
    cache_key = build_cache_key(event_data, "quick")
    cached = load_cache(cache_key)
    if cached and "quickSummary" in cached:
        print(f"[cache] quick hit for key={cache_key}")
        yield {"event": "quick", "data": cached["quickSummary"]}
        return
    trace_obj = None
    if os.getenv("AGENTOPS_API_KEY"):
        trace_obj = agentops.start_trace(tags=["concert-quick", event_data.get('title', 'unknown')[:50]])

    try:
        llm = ChatOpenAI(
            model="gpt-4o-mini",  # Faster model for quick summaries
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            streaming=True,
            max_tokens=512,  # Short response
            temperature=0.3,
        )

        quick_prompt = build_quick_prompt(event_data)
        chain = ChatPromptTemplate.from_messages([("user", quick_prompt)]) | llm | StrOutputParser()

        quick_buffer = ""
        async for chunk in chain.astream({}):
            quick_buffer += chunk
            yield {"event": "quick", "data": chunk}
        save_cache(cache_key, {"quickSummary": quick_buffer})

        if os.getenv("AGENTOPS_API_KEY"):
            agentops.end_trace(end_state="Success")

    except Exception as e:
        yield {"event": "error", "data": f"Error: {str(e)}"}
        if os.getenv("AGENTOPS_API_KEY"):
            agentops.end_trace(end_state="Fail")

async def detailed_research_handler(event_data: dict) -> AsyncGenerator[dict, None]:
    """
    Detailed mode (new two-phase system):
    - Phase 1: Extract artist list (from title, URL, or web search)
    - Phase 2: Get artist details (genres, bio, links)
    """
    cache_key = build_cache_key(event_data, "detailed")
    cached = load_cache(cache_key)
    if cached and "aiContent" in cached and "artists" in cached:
        print(f"[cache] detailed hit for key={cache_key}")
        # Serve cached content using the same event shape expected by the client
        yield {"event": "status", "data": "extracting_artists"}
        yield {"event": "artist_list", "data": json.dumps(cached["artists"])}
        yield {"event": "status", "data": "researching_artists"}
        for artist_name, artist_content in zip(cached["artists"], cached.get("artistSections", [])):
            yield {"event": "artist_result", "data": json.dumps({"artist": artist_name, "content": artist_content})}
        yield {"event": "complete", "data": "all_artists_researched"}
        return

    trace_obj = None
    if os.getenv("AGENTOPS_API_KEY"):
        trace_obj = agentops.start_trace(tags=[f"concert-detailed", event_data.get('title', 'unknown')[:50]])

    try:
        ts = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        llm = ChatOpenAI(
            model="gpt-4o",
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            streaming=False,
            max_tokens=4096,
            temperature=0.3,
        )

        # Setup tools
        tools: List[Tool] = []

        # Add URL fetching tool
        tools.append(
            Tool(
                name="fetch_url",
                func=fetch_url_content,
                description="Fetch and extract text content from a URL. Input: a URL string. Returns the page content as text. Note: foopee.com URLs will fail (use search instead)."
            )
        )

        # Add Serper search tool if available
        if os.getenv("SERPER_API_KEY"):
            serper = GoogleSerperAPIWrapper(serper_api_key=os.getenv("SERPER_API_KEY"))
            tools.append(
                Tool(
                    name="search",
                    func=serper.run,
                    description="Search the web for info about artists, events, venues. Input: a search query string."
                )
            )

        # Phase 1: Extract artist list
        yield {"event": "status", "data": "extracting_artists"}

        extract_prompt = build_extract_artists_prompt(event_data)
        artist_list_text = await run_with_tools(llm, tools, extract_prompt)

        # Parse artist list (one artist per line)
        artists = [
            line.strip()
            for line in artist_list_text.strip().split('\n')
            if line.strip() and line.strip() != "Unable to determine artists"
        ]

        if not artists or artist_list_text.strip() == "Unable to determine artists":
            yield {"event": "final", "data": "Unable to determine artists for this event."}
            if os.getenv("AGENTOPS_API_KEY"):
                agentops.end_trace(end_state="Success")
            return

        # Stream the artist list immediately (JSON-serialized for SSE)
        yield {"event": "artist_list", "data": json.dumps(artists)}

        # Phase 2: Get artist details (parallel mode - streaming as they complete)
        yield {"event": "status", "data": "researching_artists"}

        artist_sections: list[str] = []
        artist_results_map: dict[str, str] = {}

        # Create parallel tasks for each artist (with 2-phase research + verification)
        async def research_and_verify_artist(artist: str) -> tuple[str, str]:
            """
            Research a single artist with 2-phase approach:
            1. Get initial details with web search
            2. Verify and clean up the results
            Returns (artist_name, final_content) only after both phases complete
            """
            try:
                # Phase 1: Get initial details
                prompt = build_single_artist_prompt(artist)
                draft_result = await run_with_tools(llm, tools, prompt)

                # Phase 2: Verify and clean up (no tools needed, just review)
                verify_prompt = f"""Review and finalize this artist research for {artist}. Fix any issues:

{draft_result}

CRITICAL - Link Validation:
- **REMOVE** any links that are generic root domains (e.g., "https://bandcamp.com", "https://instagram.com", "https://soundcloud.com")
- Links MUST be artist-specific URLs (e.g., "https://artistname.bandcamp.com", "https://instagram.com/artistname")
- If a link is invalid/generic, REMOVE the entire Link line - don't include it at all
- Only include the YouTube search link and ONE additional valid artist-specific link (if found in draft)
- If no valid additional link exists, omit the Link bullet entirely

Other Guidelines:
- Verify all links are properly formatted markdown
- Ensure genres are concise (no fluff words)
- Ensure bio is a single concise line (no fluff)
- Remove any "(not found)" entries IF you can infer information from the content
- If YouTube link is missing or malformed, add it: [Search on YouTube](https://www.youtube.com/results?search_query={artist.replace(' ', '+')})
- Keep the ### heading and bullet structure exactly
- Output ONLY the finalized artist section

Return the cleaned up artist section:"""

                # Use LLM without tools for quick verification
                verify_llm = ChatOpenAI(
                    model="gpt-4o-mini",  # Faster model for verification
                    openai_api_key=os.getenv("OPENAI_API_KEY"),
                    streaming=False,
                    max_tokens=512,
                    temperature=0.1,
                )
                final_result = await verify_llm.ainvoke(verify_prompt)
                final_content = final_result.content if hasattr(final_result, 'content') else str(final_result)

                return (artist, final_content)
            except Exception as e:
                # Return error placeholder for this artist
                fallback = f"### {artist}\n- **YouTube**: [Search on YouTube](https://www.youtube.com/results?search_query={artist.replace(' ', '+')})\n- **Genres**: (error: {str(e)[:50]})\n- **Bio**: (error during research)\n"
                return (artist, fallback)

        # Launch all artist research tasks in parallel
        tasks = [research_and_verify_artist(artist) for artist in artists]

        # Stream results as they complete (each artist sent only ONCE after full research+verify)
        for coro in asyncio.as_completed(tasks):
            try:
                artist_name, artist_content = await coro
                # JSON-serialize the dict for SSE
                yield {"event": "artist_result", "data": json.dumps({"artist": artist_name, "content": artist_content})}
                artist_results_map[artist_name] = artist_content
            except Exception as e:
                # Shouldn't reach here due to error handling in research_and_verify_artist, but just in case
                yield {"event": "error", "data": f"Unexpected error: {str(e)}"}

        # All artists completed
        yield {"event": "complete", "data": "all_artists_researched"}

        # Persist cache in artist order
        ordered_sections = [artist_results_map.get(name, "") for name in artists]
        full_content = "\n\n".join(ordered_sections)
        save_cache(cache_key, {
            "artists": artists,
            "artistSections": ordered_sections,
            "aiContent": full_content,
        })

        # Log result
        try:
            # Write task logs to the shared llm-server/logs directory (not tasks/logs)
            log_dir = Path(__file__).resolve().parent.parent / "logs"
            log_path = log_dir / f"detailed_{ts}_{os.getpid()}.md"
            log_path.parent.mkdir(parents=True, exist_ok=True)
            log_path.write_text(f"# Artists Found\n{artist_list_text}\n\n# Streaming mode - individual results sent as events")
        except Exception:
            pass

        if os.getenv("AGENTOPS_API_KEY"):
            agentops.end_trace(end_state="Success")

    except Exception as e:
        error_msg = f"Error: {str(e)}"
        yield {"event": "error", "data": error_msg}
        if os.getenv("AGENTOPS_API_KEY"):
            agentops.end_trace(end_state="Fail")

def parse_artists(title: str) -> list[str]:
    """Parse artist names from event title"""
    separators = [',', ' - ', ' / ', ' + ', ' w/ ', ' with ']

    for sep in separators:
        if sep in title:
            return [artist.strip() for artist in title.split(sep)]

    return [title.strip()]


async def run_with_tools(llm: ChatOpenAI, tools: List[Tool], prompt: str, debug: bool = False) -> str:
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


def chunk_text(text: str, size: int):
    for i in range(0, len(text), size):
        yield text[i:i+size]

async def concert_research_handler(event_data: dict, mode: str = "quick") -> AsyncGenerator[dict, None]:
    """
    Main handler that dispatches to quick or detailed mode.

    Args:
        event_data: Event details (title, venue, date, url)
        mode: "quick" (fast streaming summary) or "detailed" (full research with tools)

    Returns:
        AsyncGenerator yielding event dicts:
        - Quick mode: {"event": "quick", "data": "streaming text..."}
        - Detailed mode: {"event": "draft"/"status"/"final", "data": "..."}
    """
    if mode == "quick":
        async for event in quick_research_handler(event_data):
            yield event
    elif mode == "detailed":
        async for event in detailed_research_handler(event_data):
            yield event
    else:
        yield {"event": "error", "data": f"Invalid mode: {mode}. Use 'quick' or 'detailed'."}
