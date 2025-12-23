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


def build_youtube_prompt(artist: str) -> str:
    """Build prompt for finding YouTube URL."""
    return f"""Find a valid YouTube URL for {artist}. 

CRITICAL: Use the search tool to find actual YouTube video URLs. Do NOT just return a search URL unless you've thoroughly searched and found nothing.

SEARCH STRATEGY:
1. Search for "{artist} music" or "{artist} band music" - this typically yields good results
2. Look through the search results for actual YouTube URLs (youtube.com/watch?v=... or youtu.be/...)
3. Extract the FIRST valid YouTube video URL you find in the search results
5. If you find a channel URL (youtube.com/@... or youtube.com/c/...), that's acceptable but video URLs are preferred
6. As a last resort, return null and provide a search URL

WHAT TO LOOK FOR IN SEARCH RESULTS:
- YouTube video URLs: youtube.com/watch?v=... or youtu.be/...
- YouTube channel URLs: youtube.com/@... or youtube.com/c/...
- Look for the actual URLs in the search result text/links
- Don't just look at titles - extract the actual URLs from the results

SEARCH QUERIES TO TRY:
- "{artist} music youtube" (most effective - try this first)
- "{artist} performance youtube"
- "{artist} live youtube"
- "{artist} band youtube"
- "{artist} youtube"

Output JSON with keys:
- youtube_url: a valid YouTube watch URL (https://www.youtube.com/watch?v=...) OR channel URL (https://www.youtube.com/@... or https://www.youtube.com/c/...). MUST be an actual URL extracted from search results or your training data. Return null ONLY if you cannot find any YouTube URL after thorough searching.
- fallback_search_url: a YouTube search URL (https://www.youtube.com/results?search_query=...) - always include this

IMPORTANT: The youtube_url should be an actual YouTube video or channel URL, NOT a search URL. Only return null for youtube_url if you've tried multiple search queries and found no YouTube URLs in the results.

If you cannot find any YouTube URL after thorough searching, return:
{{"youtube_url": null, "fallback_search_url": "https://www.youtube.com/results?search_query={artist.replace(' ', '+')}+music"}}

Return ONLY JSON, no other text."""


def build_bio_genres_prompt(artist: str) -> str:
    """Build prompt for finding bio and genres."""
    return f"""Provide a short bio and genres for {artist}.

CRITICAL: Use tools to find information. Do NOT return "not found" without thoroughly searching.

SEARCH STRATEGY:
1. FIRST: Use the search tool to find information about {artist}
   - Search for "{artist} band" or "{artist} music" or "{artist} artist"
   - Look for bio information in search result snippets
   - Extract bio from Wikipedia entries, music platform descriptions, or article previews
2. CRITICAL: If search results mention ANY website, Bandcamp, or music platform link:
   - IMMEDIATELY use the fetch_url tool to visit that URL
   - Read the full page content to extract bio information
   - Many artist websites have "About", "Bio", or "Artist" sections
   - Bandcamp pages often have detailed artist descriptions
   - Look for paragraphs that describe: origin, background, style, influences, notable works
   - Even if search snippets have some info, the full page usually has more complete bio
3. If you find multiple sources (search results + website content), synthesize the best information
4. Extract genres from any information you find (bio text, search results, website content, page descriptions)

BIO REQUIREMENTS:
- Keep bio to one concise sentence, no hype words
- Include factual information: origin, style, notable works, or background
- If you find multiple sources, synthesize the most relevant information
- Only return "(not found)" if you've thoroughly searched and found absolutely nothing

GENRES REQUIREMENTS:
- Extract 2-4 genre/subgenre terms from any information you find
- Look for genre mentions in:
  * Bio text and search result snippets
  * Website/Bandcamp page content (when you fetch URLs)
  * Music platform descriptions
  * Bandcamp pages often list genres in tags, descriptions, or "About" sections
- CRITICAL: When you fetch a website or Bandcamp page, carefully read the content for genre information
  - Look for genre tags, category labels, or style descriptions
  - Many Bandcamp pages have genre tags visible in the page content
  - Artist websites often mention genres in their bio/about sections
- Examples: "House, Dance", "R&B, Soul", "Alternative Rock", "Jazz, Bebop"
- If no genres found after thorough search (including fetched pages), return empty array []

IMPORTANT:
- ALWAYS use search tool first - don't rely only on training data
- If a website/Bandcamp link appears in search results, fetch it to get BOTH bio AND genre information
- Many artists have bios AND genre information on their Bandcamp pages or personal websites
- When fetching pages, extract BOTH bio text AND genre tags/descriptions from the content
- Extract and synthesize information from multiple sources if available

Output JSON with keys: bio (string), genres (array of strings). 
- bio: One concise sentence, or "(not found)" only if absolutely nothing found after thorough search
- genres: Array of genre strings, or [] if none found

Return ONLY JSON, no other text."""


def build_website_prompt(artist: str, event_data: Dict[str, str] = None) -> str:
    """Build prompt for finding website/social links."""
    # Build context string if event data available (for disambiguation only, not as requirement)
    context_str = ""
    if event_data:
        context_parts = []
        title = event_data.get('title', '').strip()
        venue = event_data.get('venue', '').strip()
        
        if title:
            context_parts.append(f"title: {title}")
        if venue and venue.lower() != 'unknown':
            context_parts.append(f"venue: {venue}")
        
        if context_parts:
            context_str = f"\n\nEvent context: {', '.join(context_parts)}. This can help disambiguate if multiple artists with similar names exist, but don't assume the artist is necessarily based in the same location as the venue."
    
    return f"""Find an official or information-rich link for {artist}.{context_str}

CRITICAL SEARCH STRATEGY:
1. Start with "{artist}" (exact name) - personal websites often appear in the FIRST 1-3 search results
2. Check the first few results CAREFULLY - official artist websites are typically in the top results
3. Look for domains like: [artistname].com, [artistname]music.com, the[artistname]project.com, etc.
4. If search results seem unrelated to music/artists, try adding "band" or "music" to the search query
5. If multiple artists with similar names exist, use event context (venue/location) as a hint to identify the correct one
6. Verify the website is for the CORRECT artist by checking:
   - Artist name matches exactly (or is a known variation)
   - Website content confirms it's a musician/artist (not a different profession)
   - If context available, it may help confirm (but location match is NOT required)

SEARCH QUERIES TO TRY (in order):
- "{artist}" (most important - try this first, check first 3 results carefully)
- If results seem unrelated, try "{artist} band" or "{artist} music"
- "{artist} website"
- "{artist} official"
- "{artist} [location]" (only if needed for disambiguation, e.g., "{artist} Oakland" when multiple artists exist)

PRIORITY ORDER:
1. Personal website
2. Instagram profile (instagram.com/[artistname])
3. Facebook page (facebook.com/[artistname])
4. Bandcamp page ([artistname].bandcamp.com)
5. Linktree or other link aggregator

IMPORTANT:
- Personal websites are OFTEN the first search result - check carefully!
- If initial search results seem unrelated, add "band" or "music" to refine the search
- If you find a website in the first 3 search results that matches the artist name, use it
- Only return "not_found" if you've thoroughly checked multiple search queries and found nothing trustworthy
- Be especially careful with common names - event context can help disambiguate but isn't required

Output JSON: {{"label": "Website|Instagram|Facebook|Linktree|Bandcamp|Other", "url": "https://..."}}. 
If nothing trustworthy found after thorough searching, return {{"label": "not_found", "url": null}}. 
Return ONLY JSON, no other text."""


def build_music_link_prompt(artist: str, event_data: Dict[str, str] = None) -> str:
    """Build prompt for finding music platform links."""
    # Build context string if event data available (for disambiguation only)
    context_str = ""
    if event_data:
        context_parts = []
        title = event_data.get('title', '').strip()
        venue = event_data.get('venue', '').strip()
        
        if title:
            context_parts.append(f"title: {title}")
        if venue and venue.lower() != 'unknown':
            context_parts.append(f"venue: {venue}")
        
        if context_parts:
            context_str = f"\n\nEvent context: {', '.join(context_parts)}. This can help disambiguate if multiple artists with similar names exist."
    
    return f"""Find a valid, working link to {artist}'s music.{context_str}

CRITICAL: Do NOT return "not_found" unless you've thoroughly searched all options. Prefer finding ANY valid music link over leaving the field blank.

SEARCH STRATEGY:
1. FIRST: Use the spotify_search_artist tool with "{artist}" - this searches Spotify directly
   - The tool returns a URL if it finds an exact name match
   - Extract the URL from the tool result if found
2. If Spotify search doesn't find an exact match, IMMEDIATELY try Bandcamp (it's the easiest fallback):
   - Search for "{artist} bandcamp" - this often finds [artistname].bandcamp.com URLs quickly
   - Bandcamp links are very common for independent artists and easy to verify
   - If you find ANY Bandcamp link that matches the artist name (even loosely), use it
3. If Bandcamp search doesn't find results, try other platforms:
   - Search for "{artist} spotify" - sometimes web search finds Spotify links the tool missed
   - Search for "{artist} soundcloud" - look for soundcloud.com URLs
   - Search for "{artist} music" - general search may reveal music platform links

MATCHING REQUIREMENTS (RELAXED):
- For Spotify: Trust the spotify_search_artist tool if it returns a URL
- For other platforms: Accept close matches - minor differences are OK:
  - "The" prefix can be omitted (e.g., "The Beatles" matches "Beatles")
  - Small spelling variations or punctuation differences are acceptable
  - Artist name should be recognizably the same, but exact match is NOT required
- If the URL domain and artist name are clearly related (e.g., [artistname].bandcamp.com), use it
- Prefer a close match over returning "not_found"

PRIORITY ORDER (with fallback emphasis):
1. Spotify artist page (https://open.spotify.com/artist/...) - Use spotify_search_artist tool first
2. Bandcamp artist page (https://[artistname].bandcamp.com) - STRONGLY PREFERRED as fallback
   - Bandcamp links are often easy to find and verify
   - If you find a Bandcamp link that matches the artist name closely, use it
   - Don't be overly strict - if it's clearly for this artist, use it
3. SoundCloud profile (https://soundcloud.com/...) - Accept if name matches closely
4. Other music platforms - Accept if clearly for this artist

IMPORTANT:
- ALWAYS try Bandcamp as a fallback - it's often the easiest to find and verify
- If you find a Bandcamp link in search results that matches the artist name (even loosely), use it
- Only return "not_found" if you've searched Spotify, Bandcamp, SoundCloud, and general web search with no results
- Prefer finding ANY valid music link over leaving blank
- Close matches are acceptable - don't require perfect exact match

Output JSON: {{"platform": "Spotify|Bandcamp|SoundCloud|Other", "url": "https://..."}}. 
Only return {{"platform": "not_found", "url": null}} if you've thoroughly searched all options and found nothing.

Return ONLY JSON, no other text."""


# def build_single_artist_prompt(artist: str) -> str:
#     """Phase 2: Get details for a single artist (parallel mode)."""
#     return f"""Get details for this artist: {artist}

# Output format:

# ### {artist}
# - **YouTube**: [Search on YouTube](https://www.youtube.com/results?search_query=Artist+Name) (replace spaces with +)
# - **Link**: [Platform Name](url) - OPTIONAL: Include ONE additional link if found (see guidelines)
# - **Genres**: Key genres/subgenres
# - **Bio**: Single concise line with notable hook; no fluff words

# Guidelines:
# - **Search strategy**: When researching, start with: "{artist} band" - this yields better results for musical artists
# - **YouTube link**: Format as markdown link: [Search on YouTube](url) where url is the search query with artist name
# - **Link (optional)**: Include ONE additional link if you can find it via web search:
#   - Priority order: Instagram > Bandcamp > SoundCloud > Personal Website
#   - **Search queries**: Try "{artist} band website", "{artist} band instagram", "{artist} band bandcamp"
#   - **Personal websites**: Look for official artist websites in search results (often appear in first few results)
#   - Format as markdown: [Instagram](url) or [Bandcamp](url) or [SoundCloud](url) or [Website](url)
#   - Only include if you can verify it's the correct artist
#   - If no additional link found, omit this line entirely (don't write "Link: (not found)")
#   - NEVER include more than one additional link
#   - **Important**: Check search results thoroughly - personal websites are often the first result
# - **Genres**: Use web search (try "{artist} band genre") to find the artist's genres
#   - Extract genres from any information you find (bio, descriptions, articles)
#   - If the bio mentions genre terms (e.g., "house music", "R&B singer", "rock band"), extract those into Genres field
#   - Examples: "House, Dance", "R&B, Soul", "Alternative Rock"
# - **Bio**: Use web search (try "{artist} band") to find key information about the artist (one concise line)
#   - Include notable details: origin, style, achievements, notable works
#   - You can mention genre in bio too, but MUST also fill Genres field separately
# - **IMPORTANT**: If you find genre information anywhere (bio, search results, etc.), extract it to the Genres field
#   - Only mark "(not found)" if you truly cannot determine any genre from any source
# - If you cannot find trustworthy info via web search:
#   ### {artist}
#   - **YouTube**: [Search on YouTube](https://www.youtube.com/results?search_query={artist.replace(' ', '+')})
#   - **Genres**: (not found)
#   - **Bio**: (not found)
# - Do NOT make up links, genres, or bios
# - Cross-check that information matches the correct artist name
# - No fluff words like "immersive", "energetic", "vibrant"

# Output ONLY the artist section with details. No introduction, no extra text.
# """



# def compose_artist_section(artist: str, results: Dict[str, any]) -> str:
#     """Turn per-datapoint JSON results into the markdown section expected by the frontend."""
#     yt = results.get("youtube", {}) or {}
#     bio_gen = results.get("bio_genres", {}) or {}
#     website = results.get("website", {}) or {}
#     music = results.get("music", {}) or {}
    
#     # Surface top-level errors if all datapoints failed
#     if not any(val for val in [yt, bio_gen, website, music]):
#         yt = {"error": "no datapoints returned"}

#     # YouTube link
#     yt_url = yt.get("youtube_url") or yt.get("url") or None
#     search_url = yt.get("fallback_search_url") or f"https://www.youtube.com/results?search_query={artist.replace(' ', '+')}"
#     youtube_md = yt_url or search_url

#     # Website/social link
#     website_label = website.get("label")
#     website_url = website.get("url")
#     website_line = None
#     if website_label and website_label != "not_found" and website_url:
#         website_line = f"- **Link**: [{website_label}]({website_url})"

#     # Music link
#     music_platform = music.get("platform")
#     music_url = music.get("url")
#     music_line = None
#     if music_platform and music_platform != "not_found" and music_url:
#         music_line = f"- **Music**: [{music_platform}]({music_url})"

#     # Bio / Genres
#     bio = bio_gen.get("bio") or bio_gen.get("error") or "(not found)"
#     genres_list = bio_gen.get("genres") or []
#     genres_str = ", ".join(genres_list) if genres_list else "(not found)"

#     lines = [f"### {artist}"]
#     lines.append(f"- **YouTube**: [{'Watch' if yt_url else 'Search on YouTube'}]({youtube_md})")
#     if website_line:
#         lines.append(website_line)
#     lines.append(f"- **Genres**: {genres_str}")
#     lines.append(f"- **Bio**: {bio}")
#     if music_line:
#         lines.append(music_line)

#     return "\n".join(lines)
