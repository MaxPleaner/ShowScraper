class TheeParkside
  # No pagination needed here, all events shown at once.
  MAIN_URL = "https://www.theeparkside.com/live-music-2"

  cattr_accessor :events_limit, :load_time
  self.events_limit = 200
  self.load_time = 2

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    $driver.navigate.to(MAIN_URL)
    sleep load_time
    get_events.map.with_index do |event, index|
      next if index >= events_limit
      parse_event_data(event, &foreach_event_blk)
    end.compact
  end

  class << self
    private

    def get_events
      $driver.css(".vp-event-link")
    end

    def parse_event_data(event, &foreach_event_blk)
      img = get_high_res_image(event)
      return unless img # their "bar closed" events have no image
      {
        date: parse_date(event.css(".vp-month-n-day")[0].text),
        url: event.attribute("href"),
        title: event.css(".vp-event-name")[0].text,
        details: "",
        # details: event.css(".hmt-event-subtitle")[0]&.text || "",
        img: img,
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def get_high_res_image(event)
      img = event.css(".vp-main-img")[0]
      # event.css(".vp-main-img")[0].click
      # graphic_container = $driver.css(".graphic-container")[0]
      # return unless graphic_container

      # link = graphic_container.
      #   attribute("style").
      #   scan(/url\(\"(.+)\"\)/)[0][0]

      link = img.
        attribute("style").
        scan(/url\(\"(.+)\"\)/)[0][0]

      # link.tap { $driver.css(".close_btn")[0].click }
    end

    def parse_date(date_string)
      DateTime.parse(date_string)
    end
  end
end
