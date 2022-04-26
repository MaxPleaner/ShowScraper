require "selenium-webdriver"
require 'pry'
require 'active_support/all'

options = Selenium::WebDriver::Chrome::Options.new
options.add_argument('--headless')
$driver = Selenium::WebDriver.for :chrome, options: options


load './selenium_patches.rb'

Dir.glob("./sources/*.rb").each { |path| load path }

Knockout.run