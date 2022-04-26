require "selenium-webdriver"
require 'pry'
require 'active_support/all'

Dir.glob("#{__dir__}/lib/sources/*.rb").each { |path| load path }

options = Selenium::WebDriver::Chrome::Options.new
options.add_argument('--headless')
$driver = Selenium::WebDriver.for :chrome, options: options
load "#{__dir__}/lib/selenium_patches.rb"

Knockout.run
