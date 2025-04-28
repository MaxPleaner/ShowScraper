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

if ENV["NO_GCS"] == "true"
  GCS = nil
else
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
          unless %i[url date title].all? { |key| event_data[key].present? }
            raise "#{source.name} had missing data keys"
          end
          if persist_mode == :sql
            persist_sql(source, event_data)
          end
        end
        persist_event_list(source, event_list) if persist_mode == :static
        results[source.name] = event_list
      rescue => e
#        if ENV["RESCUE_SCRAPING_ERRORS"] == "true"
          if source == Paramount && !$retried_paramount
            $retried_paramount = true
            puts "RETRYING PARAMOUNT"
            sleep 5
            retry
          else
            puts e, e.backtrace
            errors.push({ source: source.name, error: e })
          end
 #       else
 #         raise
 #       end
      end

      # persist_error_list

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
      GCS&.upload_file(source: SOURCE_LIST_JSON, dest: "sources.json")
    end

    def persist_event_list(source, event_list)
      # Sometimes there are duplicate events, mainly caused by calendar views
      # showing the previous / next months events.
      json = event_list.uniq.to_json

      # upload to GCS
      GCS&.upload_text_as_file(text: json, dest: "#{source}.json")

      # Write the event count to a condensed log file
      unless ENV["LOG_PATH"].blank?
        File.open(ENV["LOG_PATH"], "a") do |f|
          f.puts "#{Time.now.strftime("%m/%d/%Y")}: scraped #{event_list.uniq.count.to_s.ljust(4)} events from #{source}"
        end
      end
    end

    def init_driver
      options = Selenium::WebDriver::Chrome::Options.new
      options.add_argument('--headless') unless ENV["HEADLESS"] == "false"
      options.add_argument('--window-size=1920,1080')
      options.add_argument('--disable-blink-features=AutomationControlled')
      options.add_argument('--no-sandbox')
      options.add_argument('--disable-dev-shm-usage')
      options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')

      if File.exist?("/proc/device-tree/model") && `cat /proc/device-tree/model`.include?("Raspberry Pi")
        driver_path = "/usr/bin/chromedriver"
        service = Selenium::WebDriver::Chrome::Service.new(path: driver_path)
      else
        service = Selenium::WebDriver::Chrome::Service.chrome
      end

      driver = Selenium::WebDriver.for :chrome, options: options, service: service

      SeleniumPatches.patch_driver(driver)
      driver
    end

    require 'timeout'
    def run_scraper(source, events_limit: nil, &foreach_event_blk)
      Timeout.timeout(60 * 3) do
        source.run(**{ events_limit: events_limit }.compact, &foreach_event_blk)
      end
    end

  end
end

# Scraper.run([DnaLounge], persist: true)
