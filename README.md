# ShowScraper

## Basic Architecture

This repo has three parts:

- **Scraper**: A bunch of scrapers which fetch concert listings from
various venues in the Bay Area (Ruby / Selenium). Essentially a one-off process which you can schedule to run daily via Cron or Systemd or whatever. It writes results to a GCS bucket.
- **Frontend**: A website to view the listings (React). Compiled to a static site via `npm build` and deployed to Github pages via a Github action. It reads the files off GCS and can send API requests to the LLM Server
- **LLM Server**: a LLM backend to research additional concert details (Python / LangChain). It's a web server you need to keep running on some machine.

## Frontend-only quickstart
- `cd frontend/react-app`
- `npm i`
- `npm run dev`
- To build & deploy, run `ShowScraper/bin/deploy`.

## Setting up the scraper

1. Install a modern ruby and `bundle install`
2. Install a driver
   - Currently the app is set up to use Firefox or Chromedriver. I previously was using Chromedriver but I switched to Firefox. Edit [Scraper#init_driver](https://github.com/MaxPleaner/ShowScraper/blob/460a3e3d7bbd8c770bab26bdd82d5606ed86c0be/scraper/scraper.rb#L128) to switch implementation.
   - For Chromedriver:
     - On Linux you can `apt-get install chromium-chromedriver`. Our application should hopefully pick up the executable path automatically.
     - On Windows / OSX, download from [https://chromedriver.chromium.org/](https://chromedriver.chromium.org/) and add the executable-containing folder to your `PATH` manually.
   - For Firefox:
     - Install Geckodriver and set `GECKODRIVER_PATH` in env to point directly to the executable. I found it at `/opt/homebrew/bin/geckodriver` for OSX or `/usr/local/bin/geckodriver` for Linux
3. copy `.env.example` to `.env` and configure it
4. Make a new project on GCP and create a GCS bucket within it. Set `STORAGE_PROJECT` in `.env` to your project id. Download the `keyfile.json` and set `STORAGE_CREDENTIALS` to this file's path.
5. Make a new "project" on google cloud. Create a GCS bucket in the project. Add the credentials to `.env`:
6. Change the GCS bucket permissions so all files are publicly available by default.
7. Configure `gsutils` to use your new project, then upload the CORS file which I've included in the repo:

    ```
    gsutil cors set cors-json-file.json gs://<BUCKET_NAME>
    ```

## Running the scraper

There is a command line tool at `bin/run_scraper`.
By default it will run all scrapers (each will fetch a maximum of 200 events) 
and then upload the results to GCS.

**Options** (note that most of these can also be set from `.env`)

```
# Limits each scraper to N results
--limit=10

# Just print the results, don't upload them to GCS
--skip-persist

# Don't rescue scraping errors - stop the script immediately
--rescue=false

# Skip broken scrapers (default behavior)
--rescue=true

# Trigger a binding.pry breakpoint upon error
--debugger

# Just update the list of venues. Don't actually scrape any events.
--no-scrape

# Limit the scrape to a set of venues. Comma-separated list.
--sources=GreyArea,Cornerstone

# Run headlessly
--headless=true

```

Note that every time you run a scraper, it will completely overwrite the list of events for that venue.


## Setup - LLM Server

The LLM server provides AI-powered concert research via streaming SSE endpoints.

It's currently set up to use OpenAI, but you can probably switch it to use another provider easily.

1. Add API keys to `llm-server/.env`:
   ```
   OPENAI_API_KEY=your_key_here
   SERPAPI_API_KEY=your_key_here
   ```
1. `cd llm-server`
2. `uv venv venv` (create a virtual environment)
3. `source venv/bin/activate`
2. `uv pip install -r requirements.txt`

4. `python main.py` (runs on localhost:8000)

The server is used by the frontend's AI Research feature to provide two-phase streaming concert information.

## Adding a new scraper

1. Add a new entry to `sources.json`. You can get `latlng` from Google Maps
(right click the marker on the map and the coords will pop up). For `desc` you can
just copy the blurb from Google Maps as well.

2. Create a new file `scraper/lib/sources/venue_name.rb` (replacing `venue_name`, obviously).

3. You can copy one of the existing scraper classes as a starting point.
   Note that there are a few different types of websites (calendar view, infinite scroll, all-on-one-page)
   so it's best to find another scraper that is similar in that regard.

4. Make sure the class name is the exact same as the `name` value in `sources.json`

5. Fill out the contents of the scraper, using `--debugger` and `--headless=false`
   as needed for debugging.

6. Add a test case to `scraper_spec.rb` (can just use `generic_run_test` like the other scrapers)

Note, there is no need to explicitly `require` the scraper class anywhere into the codebase.
Autoloading is already set up based on `sources.json`.

## A note about the unused/server and unused/db folders

These are both unused. I kept them here in case I want to have a dedicated backend at some point.

For now it suffices to go backend-less and just host the results on GCS.

## Development - TODOS

- [x] Map View
- [ ] Add more meta-scrapers (e.g. scrape other scrapers/aggregators), especially for electronic shows which aren't really captured by the current venue list or "The List"
- [ ] Add more venues (have specifically received requests for South Bay, but probably there are new SF / East Bay venues as well). 
- [ ] Add Venue Events List view (accessible from Venue List View)
- [x] Find a way to handle events that don't have an explicit year in their date
- [x] Add Submit Event / About pages
