class TheeParkside
  # No pagination needed here, all events shown at once.
  MAIN_URL = "https://www.theeparkside.com/live-music-2"

  cattr_accessor :events_limit, :load_time
  self.events_limit = 200
  self.load_time = 2

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    get_events.map.with_index do |event, index|
      next if index >= events_limit
      parse_event_data(event, &foreach_event_blk)
    end.compact
  end

  class << self
    private

    def get_events
      $driver.navigate.to(MAIN_URL)
      sleep load_time
      $driver.css(".hmt-event-item")
    end

    def parse_event_data(event, &foreach_event_blk)
      img = get_high_res_image(event)
      return unless img # their "bar closed" events have no image
      {
        date: parse_date(event.css(".hmt-event-start-span")[0].text),
        url: MAIN_URL,
        title: event.css(".hmt-event-title")[0].text,
        details: event.css(".hmt-event-subtitle")[0]&.text || "",
        img: img,
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def get_high_res_image(event)
      event.css(".hmt-flyer")[0].click
      graphic_container = $driver.css(".graphic-container")[0]
      return unless graphic_container

      link = graphic_container.
        attribute("style").
        scan(/url\(\"(.+)\"\)/)[0][0]

      link.tap { $driver.css(".close_btn")[0].click }
    end

    def parse_date(date_string)
      DateTime.parse(date_string)
    end
  end
end
