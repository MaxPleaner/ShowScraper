# ShowScraper

This is a collection of a bunch of scrapers which fetch concert listings from
various venues in the Bay Area.

It also is a website to view the listings.

## Tech Stack

The scraper uses headless [Selenium](https://www.selenium.dev/)
([Chromedriver](https://chromedriver.chromium.org/downloads))
and is written in [Ruby](https://www.ruby-lang.org/en/).

Results are converted to [JSON](https://www.json.org/json-en.html)
and pushed to a [Google Cloud Storage](https://cloud.google.com/storage)
bucket.

The front end is written in [React](https://reactjs.org/)
and styled with [Bulma CSS framework](https://bulma.io/).

## Setup - Scraper

1. Run `bundle install` in the root of the repo using a stable Ruby version

1. You're gonna need to install Chromedriver.
     - **On Raspberry Pi**:  you can do this with `sudo apt-get install chromium-chromedriver` and this will happen automatically (the scraper will check your system architecture and use the right 
       chromedriver path)
     - **on OSX and Windows** you can find all versions at [https://chromedriver.chromium.org/](https://chromedriver.chromium.org/) and then add it to your PATH.
       For example, add this to your `~/.bash_profile`:
         ```
         export PATH=$PATH:/path/to/folder/containing/chromedriver/
         ```

1. Run `cp .env.example .env` in the root of the repo. The `.env` file sets environment variables which can be used to customize the application's behavior. This file can be edited directly.

1. Make a new "project" on google cloud. Create a GCS bucket in the project. Add the credentials to `.env`:
  
    ```
    STORAGE_PROJECT = "my-project-id"
    STORAGE_CREDENTIALS = "path/to/keyfile.json"
    ```

1. Change the GCS bucket permissions so all files are publicly available by default.

1. Configure `gsutils` to use your new project, then upload the CORS file which I've included in the repo:

    ```
    gsutil cors set cors-json-file.json gs://<BUCKET_NAME>
    ```

## Setup - Frontend

1. Make sure you're using a stable Node version
2. `cd frontend/react-app`
3. run `yarn install` to get dependencies
4. `yarn start` and then open `localhost:3000`

To build the project for production, use `yarn build`

_Note_: There is also a script which you can run from the root of the repo to start the react server:

```
bin/run_frontend
```

This runs `nvm use 14; cd frontend/react_app && yarn install & yarn start`

Note you will probably have to change this `nvm use 14` if you are using a different Node version.

## Setup - LLM Server

The LLM server provides AI-powered concert research via streaming SSE endpoints.

1. `cd llm-server`
2. `pip install -r requirements.txt`
3. Add API keys to `.env`:
   ```
   ANTHROPIC_API_KEY=your_key_here
   SERPAPI_API_KEY=your_key_here
   ```
4. `python main.py` (runs on localhost:8000)

The server is used by the frontend's AI Research feature to provide two-phase streaming concert information.

## Running Scraper

There is a command line tool at `bin/run_scraper`.
By default it will run all scrapers (each will fetch a maximum of 200 events) 
and then upload the results to GCS.

**Options** (note that most of these can also be set from `.env`)

```
# Limits each scraper to N results
--limit=10

# Just print the results, don't upload them to GCS
--skip-persist

# Don't rescue scraping errors - one broken scraper will stop the whole script
# If rescue=true (the default) then broken scrapers will just be skipped
--rescue=false

# Just update the list of venues. Don't actually scrape any events.
--no-scrape

# Limit the scrape to a set of venues. Comma-separated list.
--sources=GreyArea,Cornerstone

# Run headlessly, or not
--headless=true
--headless=false
```

For example, combining options:

```
bin/run-scraper --headless=true --limit=5 --skip-persist --rescue=false sources=ElboRoom,Knockout
```

There are some other configuration options done through ENV, see `.env.example`

Note that every time you run a scraper, it will completely overwrite the list of events for that venue.

## Testing

There are some basic automated tests for the scrapers. Run `bundle exec rspec` from the root of the repo.
Using rspec you can also isolate certain tests to run (left as an exercise to the reader).

## Adding a new scraper

1. Add a new entry to `sources.json`. You can get `latlng` from Google Maps
(right click the marker on the map and the coords will pop up). For `desc` you can
just copy the blurb from Google Maps as well.

2. Create a new file `scraper/lib/sources/venue_name.rb` (replacing `venue_name`, obviously).

3. You can copy one of the existing scraper classes as a starting point.
   Note that there are a few different types of websites (calendar view, infinite scroll, all-on-one-page)
   so it's best to find another scraper that is similar in that regard.

4. Make sure the class name is the exact same as the `name` value in `sources.json`

5. Fill out the contents of the scraper, using `binding.pry` and the `HEADLESS=false`
   environment variable as needed for debugging.

6. Add a test case to `scraper_spec.rb` (can just use `generic_run_test` like the other scrapers)

Note, there is no need to explicitly `require` the scraper class anywhere into the codebase.
Autoloading is already set up based on `sources.json`.

## A note about the unused/server and unused/db folders

These are both unused. I kept them here in case I want to have a dedicated backend at some point.

For now it suffices to go backend-less and just host the results on GCS.

## Development - TODOS

- [ ] Map View
- [ ] Add more meta-scrapers (e.g. scrape other scrapers/aggregators), especially for electronic shows which aren't really captured by the current venue list or "The List"
- [ ] Add more venues (have specifically received requests for South Bay, but probably there are new SF / East Bay venues as well). 
- [ ] Add Venue Events List view (accessible from Venue List View)
- [x] Find a way to handle events that don't have an explicit year in their date
- [x] Add Submit Event / About pages
