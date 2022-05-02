require "selenium-webdriver"
require 'pry'
require 'active_support/all'
require 'dotenv'

Dotenv.load("#{__dir__}/../.env")

require "#{__dir__}/lib/selenium_patches.rb"
Dir.glob("#{__dir__}/lib/sources/*.rb").each { |path| require path }

unless ENV["NO_DB"] == "true"
  require "#{__dir__}/../db/db.rb"
end

unless ENV["NO_GCS"] == "true"
  require "#{__dir__}/lib/gcs.rb"
end

class Utils
  def self.print_event_preview(source, data, condense_data: false)
    return unless ENV["PRINT_EVENTS"] == "true"
    if condense_data
      puts("#{source.name} #{data[:date]&.strftime("%m/%d")}: #{data[:title]&.gsub("\n", " ")}")
    else
      pp data
    end
  end

  def self.quit!
    $driver&.quit
    exit!
  end
end

class Scraper
  SOURCES = [
    DnaLounge,
    ElboRoom,
    ElisMileHighClub,
    GoldenBull,
    GreyArea,
    Knockout,
    TheeParkside,
    BottomOfTheHill,
    Cornerstone

    # TODO Venues:
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

    def run(sources=SOURCES, events_limit: nil, persist_mode: :static)
      $driver ||= init_driver
      at_exit { $driver.quit }

      results = sources.
        index_by { |source| source.name }.
        transform_values do |source|
          run_scraper(source, events_limit: events_limit) do |event_data|
            if persist_mode == :sql
              persist_sql(source, event_data)
            end
          end
        end

      if persist_mode == :static
        # for static persistence we do it in one big chunk at the end
        persist_static(results)
      end

      results
    end

    private

    def persist_sql(source, event_data)
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

    def persist_static(results)
      GCS.upload_text_as_file(text: results.to_json, dest: "events.json")
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

    def run_scraper(source, events_limit: nil, &foreach_event_blk)
      source.run({ events_limit: events_limit }.compact, &foreach_event_blk)
    rescue => e
      if ENV["RESCUE_SCRAPING_ERRORS"] == "true"
        puts "ERROR scraping #{source.name}: #{e}"
        {}
      else
        raise e
      end
    end

  end
end

# Scraper.run([DnaLounge], persist: true)
