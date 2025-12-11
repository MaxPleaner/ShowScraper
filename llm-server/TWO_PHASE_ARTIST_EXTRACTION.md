# Two-Phase Artist Extraction Implementation

## Overview

Restructured the "Get Artist Details" workflow into two explicit LLM queries:

1. **Phase 1**: Extract artist list from event
2. **Phase 2**: Get detailed info for each artist

## Changes Made

### Backend (`llm-server/tasks/concert_research.py`)

#### New Functions

**`build_extract_artists_prompt(event_data)`**
- Extracts list of performing artists
- Tries title first, then URL or web search
- Special handling for foopee.com (not scrapable, uses web search instead)
- Returns simple list: one artist per line, no formatting

**`build_artist_details_prompt(artists)`**
- Takes extracted artist list
- Gets genres, bio, links for each artist
- Returns ONLY artist list with details (no overview, no venue info)
- If artist not found, explicitly says "(not found)" for each field

#### Updated Function

**`detailed_research_handler(event_data)`**
- Completely rewritten for two-phase approach
- Phase 1: Extracts artists → yields `{"event": "status", "data": "extracting_artists"}`
- Phase 2: Gets details → yields `{"event": "status", "data": "researching_artists"}`
- Final result: yields `{"event": "final", "data": "artist details markdown"}`
- If no artists found: returns "Unable to determine artists for this event."

### Frontend (`frontend/react-app/`)

#### `src/components/EventListItem.jsx`

**Updated Status Handling:**
```javascript
eventSource.addEventListener('status', (e) => {
  if (e.data === 'extracting_artists') {
    // Show "Extracting artist list..." loading
  } else if (e.data === 'researching_artists') {
    // Show "Researching artist details..." loading
  }
});
```

#### `src/components/AIResearchModal.jsx`

**Updated Status Messages:**
- "Extracting artist list..." (during Phase 1)
- "Researching artist details..." (during Phase 2)

## Workflow Details

### Phase 1: Extract Artists

**Prompt Strategy:**
1. Try to extract from event title first
2. If not clear:
   - **foopee.com events**: Perform web search (URL not scrapable)
   - **Other events**: Try fetching URL, fallback to web search

**Output Format:**
```
Radiohead
Phoebe Bridgers
The National
```

Or if unable to find:
```
Unable to determine artists
```

### Phase 2: Get Artist Details

**Input:** List of artist names from Phase 1

**Prompt Focus:**
- Get genres (key genres/subgenres)
- Get bio (single concise line, no fluff)
- Get links (YouTube + social + Spotify/Bandcamp if useful)

**Output Format:**
```markdown
### Radiohead
- **Links**: [YouTube](https://...), [Instagram](https://...), [Spotify](https://...)
- **Genres**: Alternative rock, experimental rock, electronic
- **Bio**: Influential British band known for experimental sound and albums like OK Computer and Kid A

### Phoebe Bridgers
- **Links**: [YouTube](https://...), [Instagram](https://...)
- **Genres**: Indie folk, indie rock
- **Bio**: Singer-songwriter known for introspective lyrics and albums Punisher and Stranger in the Alps

### Unknown Artist Name
- **Links**: (not found)
- **Genres**: (not found)
- **Bio**: (not found)
```

## Special Handling

### foopee.com Events

**Problem:** foopee.com blocks scraping

**Solution:**
```python
is_foopee = 'foopee.com' in event_data.get('url', '').lower()

if is_foopee:
    # Perform web search instead of fetching URL
    # Search query: "{title} {venue} {date}"
```

### Unable to Find Artists

If Phase 1 returns "Unable to determine artists":
- Skip Phase 2 entirely
- Return: "Unable to determine artists for this event."
- Don't waste tokens on Phase 2

## Benefits

### 1. **Explicit Separation of Concerns**
- Phase 1 focuses ONLY on finding artist names
- Phase 2 focuses ONLY on getting artist details
- No more mixed prompts trying to do both

### 2. **Better Results**
- LLM can focus on one task at a time
- Phase 1 can use web search to find artist lists
- Phase 2 gets clean artist names (not guesses from title parsing)

### 3. **Clearer Output**
- No overview/venue fluff mixed with artist info
- Just clean artist list with details
- If info not found, explicitly states "(not found)"

### 4. **Handles Complex Events**
- Showcases (title doesn't contain artists)
- Festival events (multiple artists not in title)
- Events with ambiguous titles

## Status Events

The frontend shows these status updates during research:

1. **Initial**: "Get Artist Details" button visible
2. **Phase 1** (`extracting_artists`): "Extracting artist list..."
3. **Phase 2** (`researching_artists`): "Researching artist details..."
4. **Complete**: Artist list with details displayed

## Testing Scenarios

### Scenario 1: Simple Event (Artists in Title)
```
Title: "Radiohead"
Expected: Phase 1 extracts "Radiohead", Phase 2 gets details
```

### Scenario 2: Multiple Artists
```
Title: "Radiohead, Phoebe Bridgers, The National"
Expected: Phase 1 extracts all three, Phase 2 gets details for each
```

### Scenario 3: Showcase Event
```
Title: "Gray Area Cultural Incubator Showcase 2025"
Expected: Phase 1 uses web search to find artist list, Phase 2 gets details
```

### Scenario 4: foopee.com Event
```
URL: "https://foopee.com/event/123"
Expected: Phase 1 skips URL fetch, uses web search instead
```

### Scenario 5: Unknown Event
```
Title: "Mystery Show"
Expected: Phase 1 returns "Unable to determine artists", stops
```

## Deprecated Code

**Old Functions (kept for reference):**
- `build_research_prompt()` - Old combined prompt
- `build_editor_prompt()` - Old proofreading prompt
- `parse_artists()` - Old title parsing (still used as fallback)

These functions are no longer used in the new workflow but remain in code for reference.

## Implementation Notes

- Uses same `run_with_tools()` function for both phases
- Both phases use Serper tool for web search
- No streaming in detailed mode (both phases wait for complete response)
- Results logged to `logs/detailed_{timestamp}.md`
- AgentOps tracing tags changed from "concert-research" to "concert-detailed"
