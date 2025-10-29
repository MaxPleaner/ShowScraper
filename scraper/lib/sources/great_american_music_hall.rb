require 'nokogiri'
require 'open-uri'

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
    doc = Nokogiri.parse(URI.open(MAIN_URL).read)
    events = get_events(doc)
    events.map.with_index do |event, index|
      next if index >= events_limit
      parse_event_data(event, &foreach_event_blk)
    end.compact
  end

  class << self
    private

    def get_events(doc)
      doc.css(".seetickets-list-event-container")
    end

    # def get_next_page
    #   btns = $driver.css(".organizer-profile__show-more button")
    #   return false unless btns.length > 1
    #   btns[0].click
    #   true
    # end

    def parse_event_data(event, &foreach_event_blk)
      title = parse_title(event)
      return if title.blank?
      {
        url: event.css("a")[0].attribute("href").value,
        img: event.css(".seetickets-list-view-event-image-container img")[0]&.attribute("src")&.value || "",
        date: parse_date(event),
        title: title,
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def parse_title(event)
      event.css(".event-title")[0].text
    end

    def parse_date(event)
      date_str = event.css(".event-date")[0].text
      DateTime.parse(date_str)
    end
  end
end
