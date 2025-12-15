"""Prompt builders for different research modes."""
from typing import Dict


def build_quick_prompt(event_data: Dict[str, str]) -> str:
    """Build quick summary prompt - fast, streaming, no tools needed."""
    return f"""Describe this concert in 2-4 sentences for someone deciding whether to attend.

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


def build_extract_artists_prompt(event_data: Dict[str, str]) -> str:
    """Phase 1: Extract list of performing artists."""
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


def build_single_artist_prompt(artist: str) -> str:
    """Phase 2: Get details for a single artist (parallel mode)."""
    return f"""Get details for this artist: {artist}

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


def build_youtube_prompt(artist: str) -> str:
    """Build prompt for finding YouTube URL."""
    return f"""Find one YouTube URL for a live performance by {artist}. If you cannot find an exact live video, provide the best channel/official video. If still unsure, return a YouTube search URL.

Output JSON with keys:
- youtube_url: direct YouTube watch URL (preferred) OR YouTube channel/video URL
- fallback_search_url: a YouTube search URL for the artist (always include)

Return ONLY JSON."""


def build_bio_genres_prompt(artist: str) -> str:
    """Build prompt for finding bio and genres."""
    return f"""Provide a short bio and genres for {artist}.
- Keep bio to one concise sentence, no hype words.
- Genres: 2-4 genre/subgenre terms.

Output JSON with keys: bio (string), genres (array of strings). Return only JSON."""


def build_website_prompt(artist: str) -> str:
    """Build prompt for finding website/social links."""
    return f"""Find an official or information-rich link for {artist}. Priority: personal website > Instagram > Facebook page > Linktree > press bio page. Must be artist-specific.

Output JSON: {{"label": "Website|Instagram|Facebook|Linktree|Other", "url": "https://..."}}. If nothing trustworthy, return {{"label": "not_found", "url": null}}. Only JSON."""


def build_music_link_prompt(artist: str) -> str:
    """Build prompt for finding music platform links."""
    return f"""Find a direct link to {artist}'s music on Spotify or Bandcamp (prefer official artist page). If neither is available, return SoundCloud. Avoid generic home pages.

Output JSON: {{"platform": "Spotify|Bandcamp|SoundCloud|Other", "url": "https://..."}}. If nothing found, return {{"platform": "not_found", "url": null}}. Only JSON."""


def compose_artist_section(artist: str, results: Dict[str, any]) -> str:
    """Turn per-datapoint JSON results into the markdown section expected by the frontend."""
    yt = results.get("youtube", {}) or {}
    bio_gen = results.get("bio_genres", {}) or {}
    website = results.get("website", {}) or {}
    music = results.get("music", {}) or {}
    
    # Surface top-level errors if all datapoints failed
    if not any(val for val in [yt, bio_gen, website, music]):
        yt = {"error": "no datapoints returned"}

    # YouTube link
    yt_url = yt.get("youtube_url") or yt.get("url") or None
    search_url = yt.get("fallback_search_url") or f"https://www.youtube.com/results?search_query={artist.replace(' ', '+')}"
    youtube_md = yt_url or search_url

    # Website/social link
    website_label = website.get("label")
    website_url = website.get("url")
    website_line = None
    if website_label and website_label != "not_found" and website_url:
        website_line = f"- **Link**: [{website_label}]({website_url})"

    # Music link
    music_platform = music.get("platform")
    music_url = music.get("url")
    music_line = None
    if music_platform and music_platform != "not_found" and music_url:
        music_line = f"- **Music**: [{music_platform}]({music_url})"

    # Bio / Genres
    bio = bio_gen.get("bio") or bio_gen.get("error") or "(not found)"
    genres_list = bio_gen.get("genres") or []
    genres_str = ", ".join(genres_list) if genres_list else "(not found)"

    lines = [f"### {artist}"]
    lines.append(f"- **YouTube**: [{'Watch' if yt_url else 'Search on YouTube'}]({youtube_md})")
    if website_line:
        lines.append(website_line)
    lines.append(f"- **Genres**: {genres_str}")
    lines.append(f"- **Bio**: {bio}")
    if music_line:
        lines.append(music_line)

    return "\n".join(lines)
