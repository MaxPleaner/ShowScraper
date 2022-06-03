require 'nokogiri'

class GreatAmericanMusicHall
  # Awesome calendar which shows multiple months at once!
  # The downside is it's extremely fucking slow to load the initial page!
  # Actually it's so fucking slow that it never finishes loading!
  # So we have to use Nokogiri instead!
  # YAY!
  MAIN_URL = "https://gamh.com/calendar/"

  cattr_accessor :events_limit
  self.events_limit = 200

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    nokogiri = Nokogiri.parse(URI.open(MAIN_URL).read)
    events = nokogiri.css(".calendar-day-event")
    events.map.with_index do |event, index|
      next if index >= events_limit
      parse_event_data(event, &foreach_event_blk)
    end.compact
  end

  class << self
    private

    def get_events
      $driver.css("#event_tickets")
    end

    def parse_event_data(event, &foreach_event_blk)
      {
        date: parse_date(event),
        img: event.css(".detail_seetickets_image img")[0].attribute("src").value,
        title: event.css(".event-title")[0].text,
        url: event.css(".event-title")[0].attribute("href").value,
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
      rescue => e
        ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def parse_date(event)
      date_str = event.css(".date")[0].text
      month, day = date_str.scan(/(\d+)\.(\d+)/)[0]
      DateTime.parse("#{month}/#{day}")
    end
  end
end
