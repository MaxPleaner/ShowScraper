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
  def self.print_event_preview(source, data)
    return unless ENV["PRINT_EVENTS"] == "true"
    if ENV["PRINT_FULL_DETAIL"] == "true"
      pp data
    else
      puts("#{source.name} #{data[:date]&.strftime("%m/%d")}: #{data[:title]&.gsub("\n", " ")}")
    end
  end

  def self.quit!
    $driver&.quit
    exit!
  end
end

def quit!; Utils.quit! end

class Scraper
  SOURCE_LIST_JSON = "#{__dir__}/../sources.json"

  SOURCES = JSON.parse(File.read(SOURCE_LIST_JSON)).map { |source| source["name"].constantize }

  class << self

    def run(sources=SOURCES, events_limit: nil, persist_mode: :static)
      sources = SOURCES if sources.nil?

      $driver ||= init_driver
      at_exit { $driver.quit }

      persist_sources_list if persist_mode == :static

      if ENV["ONLY_UPDATE_VENUES"] == "true"
        Utils.quit!
      end

      results = {}
      errors = []
      sources.each do |source|
        next if source.const_defined?(:DISABLED) && source::DISABLED
        event_list = run_scraper(source, events_limit: events_limit) do |event_data|
          if persist_mode == :sql
            persist_sql(source, event_data)
          end
        end
        persist_event_list(source, event_list) if persist_mode == :static
        results[source.name] = event_list
      rescue => e
        if ENV["RESCUE_SCRAPING_ERRORS"] == "true"
          puts e, e.backtrace
          errors.push({ source: source.name, error: e })
        else
          raise
        end
      end

      [results, errors]
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

    def persist_sources_list
      GCS.upload_file(source: SOURCE_LIST_JSON, dest: "sources.json")
    end

    def persist_event_list(source, event_list)
      # Sometimes there are duplicate events, mainly caused by calendar views
      # showing the previous / next months events.
      json = event_list.uniq.to_json

      # upload to GCS
      GCS.upload_text_as_file(text: json, dest: "#{source}.json")

      # Also write the file locally
      # File.open("debug/#{source}.json", "w") { |f| f.write json }
    end

    def init_driver
      options = Selenium::WebDriver::Chrome::Options.new
      unless ENV["HEADLESS"] == "false"
        options.add_argument('--headless')
        options.add_argument('--window-size=1920,1080')
        options.add_argument(
          "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36"
        )
      end
      driver = Selenium::WebDriver.for :chrome, options: options
      SeleniumPatches.patch_driver(driver)
      driver
    end

    def run_scraper(source, events_limit: nil, &foreach_event_blk)
      source.run({ events_limit: events_limit }.compact, &foreach_event_blk)
    end

  end
end

# Scraper.run([DnaLounge], persist: true)
