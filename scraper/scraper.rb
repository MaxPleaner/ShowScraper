require "selenium-webdriver"
require 'pry'
require 'active_support/all'

load "#{__dir__}/lib/selenium_patches.rb"
Dir.glob("#{__dir__}/lib/sources/*.rb").each { |path| load path }

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
    DnaLounge

    # TODO Venues:
    # - Grey Matter
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
        transform_values { |source| run_scraper(source) }
    end

    private

    def init_driver
      options = Selenium::WebDriver::Chrome::Options.new
      unless ENV["HEADLESS"] == "false"
        options.add_argument('--headless')
      end
      driver = Selenium::WebDriver.for :chrome, options: options
      SeleniumPatches.patch_driver(driver)
      driver
    end

    def run_scraper(source)
      source.run
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
