class Cornerstone
  # No pagination needed here, all events shown at once.
  MAIN_URL = "https://cornerstoneberkeley.com"

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
      $driver.css(".collection-item")
    end

    def parse_event_data(event, &foreach_event_blk)
      {
        date: parse_date(event),
        title: event.css(".main-title-hover")[0].text,
        url: event.css("a")[0].attribute("href"),
        img: parse_img(event),
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def parse_date(event)
      DateTime.parse event.css(".date").first(2).map(&:text).join(" ")
    end

    def parse_img(event)
      style = event.css(".bg-image-show")[0].attribute("style")
      style.split("background-image: url(\"")[1].split("\");")[0]
    end
  end
end
