require "selenium-webdriver"
require 'pry'
require 'active_support/all'

require "#{__dir__}/lib/selenium_patches.rb"
Dir.glob("#{__dir__}/lib/sources/*.rb").each { |path| require path }
require "#{__dir__}/../db/db.rb"

# Configure scrapers
$VERBOSE = nil
Knockout.const_set(:PAGE_LIMIT, 1)

class Scraper
  SOURCES = [
    Knockout,
    ElboRoom,
    GoldenBull,
    ElisMileHighClub,
    TheeParkside,
    DnaLounge,
    GreyArea,

    # TODO Venues:
    # - Bottom of the Hill
    # - Cornerstone
    # - Benders
    # - El Rio
    # - Freight and Salvage
    # - The Chapel
    # - Greek Theater
    # - Independent
    # - Make Out Room
    # - Starline Social Club
    # - Rickshaw Stop
    # - Warfield
    # - Great American Music Hall
    # - Fillmore
    # - Yoshi's
    # - Zeitgeist
    # - Winter's Tavern
    # - Ivy Room

    # OTHER VENUES (Lower Priority):
    # - Masonic
    # - Paramount
    # - Gilman
    # - Santa Cruz Venues
    # - Fox Theater
    # - Stanford Ampitheater
    # - Great Northern
  ]

  class << self

    def run(sources=SOURCES, persist: false)
      $driver ||= init_driver

      sources.
        index_by { |source| source.name }.
        transform_values do |source|
          run_scraper(source) do |event_data|
            persist_event(source, event_data) if persist
          end
        end
    end

    private

    def persist_event(source, event_data)
      venue = Venue.find_by!(name: source.name)
      existing_event = venue.events.find_by(
        date: event_data[:date],
        title: event_data[:title]
      )
      if existing_event
        existing_event.update(event_data)
      else
        venue.events.create!(event_data)
      end
    end

    def init_driver
      options = Selenium::WebDriver::Chrome::Options.new
      unless ENV["HEADLESS"] == "false"
        options.add_argument('--headless')
      end
      driver = Selenium::WebDriver.for :chrome, options: options
      SeleniumPatches.patch_driver(driver)
      driver
    end

    def run_scraper(source, &foreach_event_blk)
      source.run(&foreach_event_blk)
    rescue => e
      if ENV["TEST"] == "true"
        raise e
      else
        puts "ERROR scraping #{source.name}: #{e}"
        {}
      end
    end

  end
end

# Scraper.run([DnaLounge], persist: true)
