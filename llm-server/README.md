# LLM Task Server

General-purpose LLM API server using LangChain and OpenAI GPT-4o with Serper web search and AgentOps monitoring.

## Setup

1. Create virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create `.env` file:
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys:
   # - OPENAI_API_KEY
   # - SERPER_API_KEY (for web search)
   # - AGENTOPS_API_KEY (for monitoring)
   ```

4. Run server:
   ```bash
   python main.py
   ```

Server will start on `http://localhost:8000`

## Testing Outside the API

You can test the concert research functionality directly without running the API server:

```bash
python test_concert_research.py
```

This will:
- Initialize AgentOps monitoring (if API key is set)
- Verify Serper web search tool access
- Run a sample concert research query
- Save the result to `test_output.md`
- Show detailed output including tool calls

Make sure your `.env` file has all required API keys before running the test.

## Available Tasks

### Concert Research

**Endpoint:** `GET /tasks/concert-research`

**Query Parameters:**
- `date` (required): Event date (YYYY-MM-DD)
- `title` (required): Event title/artist names
- `venue` (required): Venue name
- `url` (optional): Event URL

**Features:**
- Uses Serper for web search to find artist information
- Two-phase processing: draft generation + editing/proofreading
- AgentOps monitoring for tracking agent behavior
- Streams results via Server-Sent Events (SSE)

**Example:**
```bash
curl "http://localhost:8000/tasks/concert-research?date=2025-12-15&title=Test+Band&venue=Test+Venue"
```

## Monitoring

When `AGENTOPS_API_KEY` is set, all concert research sessions are tracked in AgentOps:
- View sessions at https://app.agentops.ai
- Each session is tagged with `concert-research` and the event title
- Sessions track tool calls (web searches), LLM interactions, and success/failure states

## Adding New Tasks

1. Create new file in `tasks/` directory
2. Implement handler function that yields SSE data
3. Add route in `main.py`
