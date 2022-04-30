require "selenium-webdriver"
require 'pry'
require 'active_support/all'

Dir.glob("#{__dir__}/lib/sources/*.rb").each { |path| load path }


class Scraper
  SOURCES = [
    Knockout
  ]

  class << self

    def run(sources=SOURCES, persist: false)
      init_driver
      sources.
        index_by { |source| source.name }.
        transform_values { |source| run_scraper(source) }
    end

    private

    def init_driver
      return if $driver

      options = Selenium::WebDriver::Chrome::Options.new
      options.add_argument('--headless')
      $driver = Selenium::WebDriver.for :chrome, options: options
      load "#{__dir__}/lib/selenium_patches.rb"
    end

    def run_scraper(source)
      source.run
    rescue => e
      puts "ERROR: #{e}"
      {}
    end

  end
end
