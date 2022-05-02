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
    context("persist_mode: nil") do
      def generic_run_test(sources, events_limit)
        result = described_class.run(sources, events_limit: events_limit, persist_mode: nil)
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

      it ("gets data for Knockout") { generic_run_test([Knockout], 5) }
      it ("gets data for ElboRoom") { generic_run_test([ElboRoom], 5) }
      it ("gets data for GoldenBull") { generic_run_test([GoldenBull], 5) }
      it ("gets data for ElisMileHighClub") { generic_run_test([ElisMileHighClub], 5) }
      it ("gets data for TheeParkside") { generic_run_test([TheeParkside], 5) }
      it ("gets data for DnaLounge") { generic_run_test([DnaLounge], 5) }
      it ("gets data for GreyArea") { generic_run_test([GreyArea], 5) }
      it ("gets data for BottomOfTheHill") { generic_run_test([BottomOfTheHill], 10) }
      it ("gets data for Cornerstone") { generic_run_test([Cornerstone], 5) }
      it ("gets data for ElRio") { generic_run_test([ElRio], 5) }
    end

    context "persist_mode: :sql" do
      it "saves data to sql" do
        skip("Skipping DB Tests because ENV['NO_DB'] == 'true'") if ENV["NO_DB"] == "true"

        described_class.run(events_limit: 1, persist_mode: :sql)
        described_class::SOURCES.each do |source|
          venue = Venue.find_by!(name: source.name)
          expect(venue.events.count).to eq(1)
        end
      end
    end

    context "persist_mode: :static" do
      it "saves data to s3" do
        described_class.run(events_limit: 1, persist_mode: :static)
      end
    end
  end
end
