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
    def generic_run_test(sources)
      result = described_class.run(sources)
      sources.each do |source|
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
            title: String,
            details: String,
          }.each do |event_key, type|
            expect(event[event_key]).to be_a(type)
          end
        end
      end
    end

    it ("gets data for Knockout") { generic_run_test([Knockout]) }
    it ("gets data for Elbo Room") { generic_run_test([ElboRoom]) }
    it ("gets data for Golden Bull") { generic_run_test([GoldenBull]) }
    it ("gets data for Elis Mile High club") { generic_run_test([ElisMileHighClub]) }
  end
end