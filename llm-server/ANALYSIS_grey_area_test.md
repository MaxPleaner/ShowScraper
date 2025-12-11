# Grey Area Test Analysis - Two-Phase Concert Research

## Test Event
- **Title**: Gray Area Cultural Incubator Showcase 2025
- **Venue**: Grey Area
- **URL**: https://grayarea.org/event/cultural-incubator-showcase-2025/

## The Problem: Editor Destroyed Useful Research

### Phase 1 (Draft) - 1937 chars ✅ USEFUL
**Found 9 artists via web research:**
1. Expiring Utopia
2. Ghostly Signals (with Spotify & Instagram links)
3. Yearning Machine (with Spotify & Instagram links)
4. Disambiguation
5. Pluriversal Expressions: Mission 2050
6. Where We Echo
7. MUNI Meadow
8. Heaps
9. Ceci N'est Pas

**Result**: Most had "(info not found)" for genres/bio, but **the artist names were preserved**. This is useful! A user can at least see who's performing.

**Also included**:
- Venue capacity (668 in Grand Theater)
- Location (Mission District, SF)
- Atmosphere details

### Phase 2 (Final) - 684 chars ❌ LESS USEFUL
**Collapsed to 1 generic entry:**
- "Gray Area Cultural Incubator Showcase 2025"
- Generic links (Gray Area website, YouTube search)
- Genre: "Various"
- Bio: Generic description of the incubator program

**Result**: Lost all 9 specific artist names. User has no idea who's actually performing.

---

## Root Cause

### The `parse_artists()` Problem
```python
def parse_artists(title: str) -> list[str]:
    # Splits on: ',', ' - ', ' / ', ' + ', ' w/ ', ' with '
    # For title "Gray Area Cultural Incubator Showcase 2025"
    # Returns: ["Gray Area Cultural Incubator Showcase 2025"]
```

For showcase/festival events, **artists aren't in the title** - they must be discovered via web research.

### The Editor Prompt Constraint
```python
def build_editor_prompt(event_data: dict) -> str:
    artists = parse_artists(event_data['title'])  # ← Wrong for showcases!
    artists_str = ', '.join(artists)              # ← "Gray Area Cultural..."

    prompt = f"""...
    Event:
    - Artists: {artists_str}  ← Editor thinks there's only ONE artist

    Fixes to apply:
    - For every artist in the list above: create an h3 heading...
    """
```

The editor is told: "The artists are: Gray Area Cultural Incubator Showcase 2025"

So when it sees the draft with 9 artists, it thinks "wait, I was told there's only one artist" and collapses everything.

---

## The Core Issue: Structure vs Usefulness

Your insight is dead-on:
> "At minimum all we want is something that is useful. We can give more structured guidelines, but those guidelines shouldn't come at the expense of providing something useful when the AI can't achieve them."

**What happened here:**
1. **Draft Phase**: Successfully found 9 artists via web search (USEFUL)
2. **Editor Phase**: Enforced structure based on wrong artist list (DESTROYED USEFULNESS)

**The Layers:**
- **Layer 1 (Minimum)**: Return something useful
- **Layer 2 (Ideal)**: Follow structured format with complete info
- **Layer 3 (Reality)**: When format can't be fully achieved, preserve usefulness

The editor should enhance, not destroy. If the draft found 9 artists but only has info for 2, that's still better than collapsing to 1 generic entry.

---

## Improvement Options

### Option A: Make Editor Preserve Draft's Artist Discoveries
**Change editor prompt to:**
```
The draft may have discovered artists via web research that aren't in the event title.
PRESERVE all artist entries found in the draft. Do not collapse multiple artists into one.
Only consolidate if they're clearly duplicates.
```

**Pros**: Preserves useful research
**Cons**: Editor might not know which artists to expect

### Option B: Extract Artists from Draft, Not Title
```python
async def concert_research_handler(event_data: dict):
    # Phase 1: Generate draft
    draft_markdown = await run_with_tools(...)

    # Extract artist names from draft markdown (parse h3 headers)
    discovered_artists = extract_artists_from_markdown(draft_markdown)

    # Phase 2: Editor uses discovered artists, not parsed title
    editor_prompt = build_editor_prompt(event_data, discovered_artists)
```

**Pros**: Editor knows what the draft actually found
**Cons**: Requires parsing draft markdown

### Option C: Make Editor More Flexible
Remove the strict "For every artist in the list above" constraint. Instead:
```
The draft contains artist information. For each artist found in the draft:
- Ensure they have an h3 heading
- Ensure they have Links, Genres, Bio bullets (mark "(info not found)" if missing)
- Do NOT collapse multiple artists into one
- Do NOT remove artists that were found via research
```

**Pros**: Simpler change, preserves discoveries
**Cons**: Less explicit about expected structure

### Option D: Detect Showcase Events
```python
def is_showcase_event(title: str) -> bool:
    keywords = ['showcase', 'festival', 'presents', 'incubator', 'series']
    return any(kw in title.lower() for kw in keywords)

def build_editor_prompt(event_data: dict) -> str:
    if is_showcase_event(event_data['title']):
        # Use flexible prompt that preserves draft's discoveries
    else:
        # Use current strict prompt
```

**Pros**: Handles different event types appropriately
**Cons**: More complex logic

---

## Recommended Approach

**Combination of A + C**: Make editor more flexible and explicitly preserve discoveries

### New Editor Prompt (key changes):
```python
prompt = f"""You are the editor/verifier. The draft was generated via web research
and may have discovered artists that aren't explicitly in the event title.

CRITICAL: PRESERVE all artist entries found in the draft. Do not collapse multiple
artists into a single entry unless they are obvious duplicates.

Event:
- Date: {event_data['date']}
- Venue: {event_data['venue']}
- Event Title: {event_data['title']}  # ← Don't extract artists, just show title
- Event URL: {event_data['url']}

Draft markdown (from web research):
{{draft}}

Your job:
1. Keep all artists that were discovered in the draft
2. For each artist, ensure proper structure:
   - h3 heading (### Artist Name)
   - Links bullet (YouTube + social, or "(info not found)")
   - Genres bullet (required, or "(info not found)")
   - Bio bullet (one line, or "(info not found)")
3. Remove fluff from Overview (no "immersive", "vibrant", etc.)
4. Ensure venue details in Overview (capacity, atmosphere)
5. Remove speculative language ("might", "potentially", "expect")

DO NOT collapse multiple artists into one entry.
DO NOT remove artists that were found via research.
Return final markdown only.
"""
```

---

## Success Criteria

After improvements, the Grey Area test should:
1. ✅ Draft finds 9 artists (already works)
2. ✅ **Final preserves all 9 artists** (currently fails - collapses to 1)
3. ✅ Final enhances structure (h3, bullets) without losing info
4. ✅ Final marks "(info not found)" for missing data (already works in draft)
5. ✅ Final removes fluff from Overview

**Key metric**: Final should be same length or longer than draft when draft found useful info, not 65% shorter.
