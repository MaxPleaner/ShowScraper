"""Tool setup and utilities for LLM interactions."""
from typing import List, Dict, Any
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


def spotify_search_artist(artist_name: str) -> str:
    """Search Spotify for an artist by name and return the artist URL if exact match found."""
    try:
        import spotipy
        from spotipy.oauth2 import SpotifyClientCredentials
        
        # Use client credentials flow (no user auth needed for search)
        client_id = Config.SPOTIFY_CLIENT_ID
        client_secret = Config.SPOTIFY_CLIENT_SECRET
        
        if client_id and client_secret:
            auth_manager = SpotifyClientCredentials(client_id=client_id, client_secret=client_secret)
            sp = spotipy.Spotify(auth_manager=auth_manager)
        else:
            # Without credentials, Spotify API requires authentication
            return f"Error: Spotify credentials not configured. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env file."
        
        # Search for artist
        results = sp.search(q=f'artist:"{artist_name}"', type='artist', limit=10)
        
        if not results or not results.get('artists') or not results['artists'].get('items'):
            return f"No Spotify results found for '{artist_name}'"
        
        artists = results['artists']['items']
        
        # Look for exact name match (case-insensitive)
        exact_match = None
        for artist in artists:
            if artist['name'].lower() == artist_name.lower():
                exact_match = artist
                break
        
        if exact_match:
            # Return the Spotify URL
            spotify_url = exact_match['external_urls'].get('spotify')
            if spotify_url:
                return f"Found exact match: {exact_match['name']} - {spotify_url}"
            else:
                return f"Found exact match: {exact_match['name']} but no URL available"
        
        # If no exact match, return top results for verification
        top_results = []
        for artist in artists[:3]:
            name = artist['name']
            url = artist['external_urls'].get('spotify', 'N/A')
            top_results.append(f"{name}: {url}")
        
        return f"No exact match found for '{artist_name}'. Top results: {'; '.join(top_results)}"
        
    except Exception as e:
        return f"Error searching Spotify: {str(e)}"


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
    
    # Add Spotify search tool
    tools.append(
        Tool(
            name="spotify_search_artist",
            func=spotify_search_artist,
            description="Search Spotify for an artist by exact name. Input: artist name as a string. Returns the Spotify artist URL if an exact name match is found. Use this for finding Spotify links - it's more reliable than web search."
        )
    )

    return tools


def has_search_tool(tools: List[Tool]) -> bool:
    """Check if search tool is available."""
    return any(t.name == "search" for t in tools)
