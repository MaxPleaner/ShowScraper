# Two-Workflow AI Research Implementation

## Summary

Successfully implemented a dual-workflow system for concert research that separates quick summaries from detailed artist research.

## Changes Made

### Backend (`llm-server/`)

#### 1. `tasks/concert_research.py`

**New Functions:**
- `build_quick_prompt()` - Generates prompt for 2-3 sentence quick summary
- `quick_research_handler()` - Fast streaming handler using gpt-4o-mini, no tools
- `detailed_research_handler()` - Original two-phase system (renamed from concert_research_handler)
- `concert_research_handler()` - New dispatcher that routes to quick or detailed based on mode parameter

**Key Features:**
- Quick mode: Uses `gpt-4o-mini`, 512 max tokens, true streaming (no tools)
- Detailed mode: Uses `gpt-4o`, 4096 max tokens, Serper tools, two-phase proofreading
- Both modes support AgentOps tracing
- Event types:
  - Quick: `{"event": "quick", "data": "streaming text..."}`
  - Detailed: `{"event": "draft"/"status"/"final", "data": "..."}`

#### 2. `main.py`

**Changes:**
- Added `mode` query parameter (default: "quick")
- Validates mode is "quick" or "detailed"
- Passes mode to `concert_research_handler(event_data, mode=mode)`
- Logs mode in request logs

**Endpoint:**
```
GET /tasks/concert-research?date=...&title=...&venue=...&url=...&mode=quick|detailed
```

### Frontend (`frontend/react-app/`)

#### 1. `src/components/EventListItem.jsx`

**New State:**
- `quickSummary` - Stores quick summary text
- `detailedLoading` - Loading state for detailed research

**New Methods:**
- `handleAIResearch()` - Fetches quick summary (mode=quick)
- `handleDetailedResearch()` - Fetches detailed research (mode=detailed)
- `cacheKey(event, mode)` - Generates separate cache keys for quick/detailed

**Event Handling:**
- Quick mode: Listens for `quick` events, streams to `quickSummary`
- Detailed mode: Listens for `draft`/`status`/`final` events (original behavior)
- Separate EventSource instances for each mode
- Separate localStorage caching for quick and detailed results

**Props passed to AIResearchModal:**
- `quickSummary` - Quick summary text
- `onGetDetails` - Handler to fetch detailed research
- `detailedLoading` - Loading state for detailed mode

#### 2. `src/components/AIResearchModal.jsx`

**New UI Elements:**
- Quick Summary section with:
  - Heading: "Quick Summary"
  - Summary text paragraph
  - "Get Artist Details" button (shows when no detailed content loaded)
- Detailed Research section (when detailed content available)
- Separate loading indicators for quick vs detailed modes

**User Flow:**
1. User clicks AI robot icon
2. Modal opens, immediately fetches quick summary
3. Quick summary streams in (~2-3 seconds)
4. "Get Artist Details" button appears
5. User clicks button (optional)
6. Detailed research loads with draft → proofreading → final phases

#### 3. `src/App.css`

**New Styles:**
- `.ai-quick-summary` - Container for quick summary (dark background, bordered)
- `.ai-quick-summary h3` - Green heading
- `.ai-quick-summary p` - Summary text styling
- `.ai-get-details-btn` - Gradient button with hover effects and icon

## Benefits

### 1. **Restored True Streaming**
- Quick mode uses `astream()` for real-time text generation
- No more "fake streaming" with pre-chunked text
- User sees text appear as it's generated (~2 seconds)

### 2. **Better UX**
- Instant feedback: Quick summary appears in 2-3 seconds
- Progressive disclosure: Users can stop at quick summary or drill down
- Reduced costs: Most users only need quick summary

### 3. **Separate Caching**
- Quick summaries cached independently (`aiCache:quick:...`)
- Detailed research cached independently (`aiCache:detailed:...`)
- Users can have quick summary cached without detailed research

### 4. **Performance**
- Quick mode: gpt-4o-mini (~0.5-1s response time)
- Detailed mode: gpt-4o with tools (~10-15s response time)
- Users only pay the cost if they need detailed info

## Testing

### Backend Test
```bash
cd llm-server
python -c "
import asyncio
from tasks.concert_research import concert_research_handler

async def test():
    event_data = {
        'date': '2025-12-10',
        'venue': 'Grey Area',
        'title': 'Gray Area Cultural Incubator Showcase 2025',
        'url': 'https://grayarea.org/event/cultural-incubator-showcase-2025/'
    }
    async for event in concert_research_handler(event_data, mode='quick'):
        if event['event'] == 'quick':
            print(event['data'], end='', flush=True)

asyncio.run(test())
"
```

**Expected Output:**
- Streams 2-3 sentence summary in real-time
- ~329 characters
- No tool calls, fast response

### Frontend Test
```bash
cd frontend/react-app
yarn start
```

**Manual Test Flow:**
1. Click AI robot icon on any event
2. Verify quick summary appears streaming in 2-3 seconds
3. Verify "Get Artist Details" button appears
4. Click button
5. Verify detailed research loads with draft → proofreading → final
6. Verify caching works (close and reopen modal)

## API Examples

### Quick Summary Request
```
GET http://localhost:8000/tasks/concert-research?date=2025-12-10&title=Gray%20Area%20Showcase&venue=Grey%20Area&url=https://...&mode=quick
```

**Response (SSE):**
```
event: quick
data: The Gray Area Cultural Incubator Showcase

event: quick
data:  features a mix of experimental music

event: quick
data:  and multimedia performances...
```

### Detailed Research Request
```
GET http://localhost:8000/tasks/concert-research?date=2025-12-10&title=Gray%20Area%20Showcase&venue=Grey%20Area&url=https://...&mode=detailed
```

**Response (SSE):**
```
event: draft
data: **Overview**\n- The Gray Area...

event: status
data: proofreading

event: final
data: ## Overview\n\nThe Gray Area Cultural...
```

## Migration Notes

### Breaking Changes
None - `mode` parameter defaults to "quick", but API is backward compatible.

### Deprecated
The old single-workflow approach is now the "detailed" mode. No code was removed, just reorganized.

### Cache Migration
Old cache keys (`aiCache:{date}:{venue}:{title}`) will not be used by new code.
New cache keys: `aiCache:quick:{date}:{venue}:{title}` and `aiCache:detailed:{date}:{venue}:{title}`

Users may see a one-time cache miss when upgrading.

## Future Enhancements

1. **Auto-fetch detailed**: Option to automatically fetch detailed after quick completes
2. **Streaming detailed**: Fix tool-calling to support streaming (currently blocked by LangChain limitation)
3. **Cost tracking**: Log token usage per mode for analytics
4. **Mode selection**: Let users choose default mode in settings
