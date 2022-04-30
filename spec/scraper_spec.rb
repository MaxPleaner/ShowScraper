require "#{__dir__}/../scraper/scraper.rb"

RSpec.describe Scraper do
  describe ".new_tab" do
    it "works with 2 or more tabs" do
      driver = described_class.send(:init_driver)
      driver.navigate.to("http://google.com")
      expect(driver.title).to include("Google")
      driver.new_tab("http://yahoo.com") do
        expect(driver.title).to include("Yahoo")
        driver.new_tab("http://bing.com") do
          expect(driver.title).to include("Bing")
        end
        expect(driver.title).to include("Yahoo")
      end
      expect(driver.title).to include("Google")
    end
  end

  describe ".run" do
    it "returns data" do
      result = described_class.run
      described_class::SOURCES.each do |source|
        key = source.name
        expect(result.key?(key)).to be true
        expect(result[key]).to be_a(Array)
        expect(result[key]).not_to be_empty
        result[key].each do |event|
          expect(event).to be_a(Hash)
          {
            img: String,
            date: DateTime,
            url: String,
            title: String
          }.each do |event_key, type|
            expect(event[event_key]).to be_a(type)
          end
        end
      end
    end
  end
end
