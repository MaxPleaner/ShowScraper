require "selenium-webdriver"
require 'pry'
require 'active_support/all'

require "#{__dir__}/lib/selenium_patches.rb"
Dir.glob("#{__dir__}/lib/sources/*.rb").each { |path| require path }
require "#{__dir__}/../db/db.rb"

class Scraper
  SOURCES = [
    DnaLounge,
    ElboRoom,
    ElisMileHighClub,
    GoldenBull,
    # GreyArea,
    Knockout,
    TheeParkside,

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

    def run(sources=SOURCES, events_limit: nil, persist_mode: nil)
      $driver ||= init_driver

      results = sources.
        index_by { |source| source.name }.
        transform_values do |source|
          run_scraper(source, events_limit: events_limit) do |event_data|
            if persist_mode == :sql
              # for sql persistence we stream each event in as it's loaded
              persist_event(source, event_data, persist_mode: :sql)
            end
          end
        end

      if persist_mode == :static
        # for static persistente we do it in one big chunk at the end
        persist_event(source, event_data, persist_mode: :static)
      end

      results
    end

    private

    def persist_event(source, event_data, persist_mode:)
      case persist_mode
      when :sql
        persist_sql(source, event_data)
      when :static
        persist_json_file(source, event_data)
      end
    end

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
