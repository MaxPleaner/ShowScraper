# ShowScraper - Claude Code Instructions

## Project Overview

ShowScraper is a full-stack concert aggregation platform for Bay Area venues. It combines Ruby-based web scrapers, a React frontend, and an AI-powered research server to help users discover local music events.

**Live Site**: bayareashows.org
**Data Source**: Google Cloud Storage (public JSON files)

## Architecture

### Three-Component System

1. **Scraper Backend** (Ruby + Selenium)
   - 54+ venue scrapers in `scraper/lib/sources/`
   - Uploads to GCS bucket `show-scraper-data/`
   - Main orchestrator: `scraper/scraper.rb`

2. **Frontend** (React)
   - Located in `frontend/react-app/`
   - Deployed to GitHub Pages
   - Fetches data from GCS

3. **LLM Server** (Python FastAPI)
   - Located in `llm-server/`
   - Provides AI concert research via SSE streaming
   - Uses LangChain + Claude + SerpAPI

## Tech Stack

**Scraper**: Ruby 3.3.0, Selenium WebDriver, Nokogiri, Google Cloud Storage
**Frontend**: React 18.1.0, React Router, Bulma CSS, Moment.js
**LLM Server**: FastAPI, LangChain, Anthropic Claude, SSE streaming

## Directory Structure

```
scraper/
├── scraper.rb                    # Main scraper orchestrator
├── lib/
│   ├── gcs.rb                   # GCS upload client
│   ├── selenium_patches.rb      # Custom Selenium extensions
│   └── sources/                 # 54 venue scraper classes
frontend/react-app/
├── src/
│   ├── App.jsx                  # Main app component
│   ├── components/              # UI components
│   │   ├── EventListView.jsx
│   │   ├── EventListItem.jsx
│   │   ├── AIResearchModal.jsx
│   │   └── ...
│   ├── utils/DataLoader.js      # GCS data fetcher
│   └── config.js                # LLM server config
llm-server/
├── main.py                      # FastAPI server
└── tasks/concert_research.py    # Two-phase AI research
sources.json                      # Venue metadata (50+ venues)
```

## Common Development Tasks

### Running the Scraper

```bash
# Standard run (headless Firefox)
bin/run_scraper

# Development mode (visible browser)
bin/run_scraper --headless=false

# Specific venues only
bin/run_scraper --sources=Fillmore,DnaLounge

# Dry run (no GCS upload)
bin/run_scraper --skip-persist

# Limit events per venue
bin/run_scraper --limit=50
```

### Running the Frontend

```bash
cd frontend/react-app
yarn install
yarn start              # Dev server on localhost:3000
yarn build              # Production build
yarn deploy             # Deploy to gh-pages

# Or from project root:
bin/run_frontend
```

### Running the LLM Server

```bash
cd llm-server
pip install -r requirements.txt
python main.py          # Starts on localhost:8000
```

## Development Guidelines

### Adding a New Venue Scraper

1. Create new file in `scraper/lib/sources/` (e.g., `new_venue.rb`)
2. Define class inheriting from base scraper pattern
3. Implement scraping logic to return events array:
   ```ruby
   [{url: "", title: "", date: "", img: "", details: ""}]
   ```
4. Add venue to `sources.json` with metadata:
   ```json
   {
     "name": "NewVenue",
     "description": "...",
     "img": "https://...",
     "location": "..."
   }
   ```
5. Test with: `bin/run_scraper --sources=NewVenue --skip-persist`
6. Run full scrape to upload to GCS

### Modifying Frontend Components

- Event display logic: `EventListView.jsx` and `EventListItem.jsx`
- Filtering/sorting: `EventListViewManager.jsx`
- AI research modal: `AIResearchModal.jsx`
- Data fetching: `utils/DataLoader.js`
- Styling: `App.css` (uses Bulma classes)

### Working with AI Research

- Endpoint: `/tasks/concert-research` (POST)
- Two-phase streaming: draft → proofreading
- Results cached in localStorage
- Rate limits: 10/min, 200/day
- Source code: `llm-server/tasks/concert_research.py`

## Important Notes

### Scraper Gotchas

- **Browser Default**: Uses Firefox (Geckodriver) by default, Chrome fallback
- **Timeouts**: 3 min per scraper, 15 sec per page load
- **Event Limits**: Default 200 events per venue (configurable with `--limit`)
- **Anti-Bot**: Includes CDP injection disabling and user-agent spoofing
- **Error Handling**: Rescue mode enabled by default (retry on failure)
- **Date Parsing**: Events grouped by MM-DD (ignores year for Dec/Jan edge cases)

### Frontend Gotchas

- **Data Source**: All data loaded from GCS, not local files
- **Caching**: Aggressive localStorage caching for AI research
- **Date Grouping**: Events grouped by MM-DD format, sorted chronologically
- **Mobile**: Special hover handling for touch devices
- **Calendar Export**: Supports both Google Calendar and iCal formats

### LLM Server Gotchas

- **Streaming**: Uses SSE (Server-Sent Events) for real-time output
- **Two-Phase**: Draft phase → Editor/proofreading phase
- **CORS**: Configured for localhost:3000 and production domain
- **Rate Limiting**: Enforced at IP level
- **Logging**: All requests/responses logged to `tasks/logs/`

## Testing

### Scraper Tests

```bash
bundle exec rspec spec/scraper_spec.rb
```

Tests validate:
- Each scraper returns proper event structure
- Required fields present (date, title, url)
- No GCS uploads during testing (persist_mode: nil)

### Frontend Tests

Currently no automated tests. Manual testing workflow:
1. `yarn start` for dev server
2. Test event list rendering
3. Test AI research modal
4. Test calendar export
5. Test responsive design

## Deployment

### Frontend Deployment

```bash
cd frontend/react-app
yarn build
yarn deploy    # Pushes to gh-pages branch
```

**Note**: GitHub Pages configured with custom domain (bayareashows.org)

### Scraper Deployment

- Typically run on schedule (cron job) or manually
- Ensure GCS credentials in `credentials/` directory
- Set environment variables in `.env`
- Monitor output in log file

### LLM Server Deployment

- Currently runs locally (localhost:8000)
- Requires `.env` with ANTHROPIC_API_KEY and SERPAPI_API_KEY
- For production: deploy to cloud service with CORS configuration

## Configuration Files

- `.env` - Scraper and LLM server environment variables
- `sources.json` - Venue metadata (name, description, image, location)
- `frontend/react-app/src/config.js` - LLM server endpoints
- `sources_todo.txt` - Venues to add/update

## Data Format

### Event Object
```json
{
  "url": "https://...",
  "title": "Band Name at Venue",
  "date": "Fri, Jan 15",
  "img": "https://...",
  "details": "Additional info"
}
```

### Venue Metadata (sources.json)
```json
{
  "name": "DnaLounge",
  "description": "Nightclub and restaurant...",
  "img": "https://...",
  "location": "375 11th St, San Francisco"
}
```

## Useful Commands

```bash
# View scraper sources
cat sources.json | jq '.[].name'

# Count total venues
cat sources.json | jq 'length'

# Run specific scraper with debugging
bin/run_scraper --sources=Fillmore --headless=false --debugger

# Check frontend build
cd frontend/react-app && yarn build

# Test LLM server endpoint
curl -X POST http://localhost:8000/tasks/concert-research \
  -H "Content-Type: application/json" \
  -d '{"artist_name": "Radiohead"}'
```

## Recent Migration Notes

- **Firefox Migration**: Recently switched from Chrome to Firefox for better compatibility
- **AI Refactor**: New two-phase streaming research system
- **WyldFlower Scraper**: Recently added venue
- **CSS Updates**: Calendar button styling improvements

## Code Style Preferences

- **Ruby**: Concise, minimal comments, prefer functional patterns
- **React**: Functional components, hooks over classes
- **Python**: Type hints optional, focus on clarity
- **Avoid**: Over-engineering, unnecessary abstractions, verbose comments

## Legacy Code

The `unused/` directory contains:
- Old Sinatra server (replaced by static GCS hosting)
- ActiveRecord models (database was removed, NO_DB=true)
- Keep for reference but don't use in new development
