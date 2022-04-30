require "#{__dir__}/../scraper/scraper.rb"

RSpec.describe Scraper do
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
