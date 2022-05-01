class TheeParkside
  # No pagination needed here, all events shown at once.
  MAIN_URL = "https://www.theeparkside.com/live-music-2"
  EVENT_WAIT_TIME = 2

  def self.run
    get_events.map { |event| parse_event_data(event) }
  end

  class << self
    private

    def get_events
      $driver.navigate.to(MAIN_URL)
      sleep EVENT_WAIT_TIME
      $driver.css(".hmt-event-item")
    end

    def parse_event_data(event)
      {
        date: parse_date(event.css(".hmt-event-start-span")[0].text),
        url: "",
        title: event.css(".hmt-event-title")[0].text,
        details: event.css(".hmt-event-subtitle")[0]&.text || "",
        img: get_high_res_image(event),
      }.tap { |x| pp(x) if ENV["PRINT_EVENTS"] == "true" }
    end

    def get_high_res_image(event)
      event.css(".hmt-flyer")[0].click
      link = $driver.
        css(".graphic-container")[0].
        attribute("style").
        scan(/url\(\"(.+)\"\)/)[0][0]

      link.tap { $driver.css(".close_btn")[0].click }
    end

    def parse_date(date_string)
      DateTime.parse(date_string)
    end
  end
end
