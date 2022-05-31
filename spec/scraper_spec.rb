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
        result, errors = described_class.run(sources, events_limit: events_limit, persist_mode: nil)
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
            %i[date title url].each do |required_key|
              expect(event[required_key]).not_to be_nil
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
      it ("gets data for FreightAndSalvage") { generic_run_test([FreightAndSalvage], 5) }
      it ("gets data for Zeitgeist") { generic_run_test([Zeitgeist], 5) }
      it ("gets data for TheChapel") { generic_run_test([TheChapel], 5) }
      it ("gets data for Independent") { generic_run_test([Independent], 5) }
      it ("gets data for Starline") { generic_run_test([Starline], 5) }
      it ("gets data for Warfield") { generic_run_test([Warfield], 5) }
      it ("gets data for GreatAmericanMusicHall") { generic_run_test([GreatAmericanMusicHall], 5) }
      it ("gets data for Fillmore") { generic_run_test([Fillmore], 5) }
      it ("gets data for GreekTheater") { generic_run_test([GreekTheater], 5) }
      it ("gets data for IvyRoom") { generic_run_test([IvyRoom], 5) }
      it ("gets data for UCBerkeleyTheater") { generic_run_test([UCBerkeleyTheater], 5) }
      it ("gets data for RickshawStop") { generic_run_test([RickshawStop], 5) }
      it ("gets data for MakeOutRoom") { generic_run_test([MakeOutRoom], 5) }
      it ("gets data for Yoshis") { generic_run_test([Yoshis], 5) }
      it ("gets data for Winters") { generic_run_test([Winters], 5) }
      it ("gets data for Regency") { generic_run_test([Regency], 5) }
      it ("gets data for HotelUtah") { generic_run_test([HotelUtah], 5) }
      it ("gets data for Amados") { generic_run_test([Amados], 5) }
      it ("gets data for Bimbos") { generic_run_test([Bimbos], 5) }
      it ("gets data for BrickAndMortar") { generic_run_test([BrickAndMortar], 5) }
      it ("gets data for CafeDuNord") { generic_run_test([CafeDuNord], 5) }
      it ("gets data for Crybaby") { generic_run_test([Crybaby], 15) }
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
        skip("use this for manual testing if needed")

        described_class.run(events_limit: 1, persist_mode: :static)
      end
    end
  end
end
