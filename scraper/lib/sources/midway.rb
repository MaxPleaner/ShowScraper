class Midway
  # Single page!!
  MAIN_URL = "https://themidwaysf.com/events/"

  cattr_accessor :events_limit, :load_time
  self.events_limit = 200
  self.load_time = 3

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    $driver.get(MAIN_URL)
    get_events.map.with_index do |event, index|
      next if index >= events_limit
      parse_event_data(event, &foreach_event_blk)
    end.compact
  end

  class << self
    private

    def get_events
      $driver.css(".category-MusicEvent")
    end

    def parse_event_data(event, &foreach_event_blk)
      {
        date: DateTime.parse(event.css(".event-details .date")[0].text),
        img: parse_img(event),
        title: event.css(".title")[0].text,
        url: event.css(".title a")[0].attribute("href"),
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    end

    def parse_img(event)
      event.css(".cropped-image")[0].attribute("style").scan(/url\(\"(.+)\"\)/)[0][0]
    end
  end
end
