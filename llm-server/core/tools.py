"""Tool setup and utilities for LLM interactions."""
from typing import List
from langchain_core.tools import Tool
from langchain_community.utilities import GoogleSerperAPIWrapper
from langchain_community.document_loaders import WebBaseLoader
from core.config import Config
from core.security import is_safe_url


def fetch_url_content(url: str) -> str:
    """Fetch and extract text content from a URL with SSRF protection."""
    try:
        # Validate URL for SSRF protection
        is_safe, error_msg = is_safe_url(url)
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


def build_tools() -> List[Tool]:
    """Build and return available tools for LLM."""
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
    if Config.SERPER_API_KEY:
        serper = GoogleSerperAPIWrapper(serper_api_key=Config.SERPER_API_KEY)
        tools.append(
            Tool(
                name="search",
                func=serper.run,
                description="Search the web for info about artists, events, venues. Input: a search query string."
            )
        )

    return tools


def has_search_tool(tools: List[Tool]) -> bool:
    """Check if search tool is available."""
    return any(t.name == "search" for t in tools)
