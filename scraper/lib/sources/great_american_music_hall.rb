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
    events = nokogiri.css("#event_tickets")
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
      link = event.attribute("href").value
      $driver.navigate.to(link)
      {
        date: parse_date($driver.css("[itemprop='startDate']")[0].text),
        img: $driver.css("[itemprop='image']")[0].attribute("src"),
        title: parse_title,
        url: $driver.current_url,
        details: $driver.css(".event-details")[0].text
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    end

    def parse_title
      title = $driver.css(".event-h2")[0].text
      # hacky but we make do
      subtitle = $driver.css(".event-bar-left > div:nth-child(2) > h3:nth-child(4)")[0]&.text
      [title, subtitle].compact.join(", ")
    end

    def parse_date(date_string)
      DateTime.parse(date_string)
    end
  end
end
