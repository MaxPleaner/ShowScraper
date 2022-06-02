class Cornerstone
  # No pagination needed here, all events shown at once.
  MAIN_URL = "https://cornerstoneberkeley.com/music-venue/"

  cattr_accessor :events_limit
  self.events_limit = 200

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    get_events.each.with_index.map do |event, index|
      next if index >= events_limit
      parse_event_data(event, &foreach_event_blk)
    end.compact
  end

  class << self
    private

    def get_events
      $driver.navigate.to(MAIN_URL)
      $driver.css(".list-view-item")
    end

    def parse_event_data(event, &foreach_event_blk)
      {
        date: parse_date(event),
        title: event.css(".event-name")[0].text,
        url: event.css(".event-name a")[0].attribute("href"),
        img: event.css(".attachment-post-thumbnail")[0]&.attribute("src") || "",
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def parse_date(event)
      # todo: no year
      date_string = event.css(".dates")[0].text
      DateTime.parse(date_string)
    end
  end
end
