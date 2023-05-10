class RickshawStop
  # Awesome calendar which shows multiple months at once!
  # However it ended up not being easy to scrape because it uses multiple
  # hosts for detail pages.
  MAIN_URL = "https://rickshawstop.com/calendar/"

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
      # resize the window so we get the better-organized calendar view
      max_width, max_height = $driver.execute_script("return [window.screen.availWidth, window.screen.availHeight];")
      $driver.manage.window.resize_to(2000, max_height)

      $driver.css(".seetickets-calendar-event-container")
    end

    def parse_event_data(event, &foreach_event_blk)
      {
        date: parse_date(event),
        img: event.css(".seetickets-calendar-event-picture img")[0].attribute("src"),
        title: event.css(".title")[0].text,
        url: event.css(".seetickets-calendar-event-picture")[0].attribute("href"),
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def parse_date(event)
      month, day = event.css(".seetickets-buy-btn a")[0].attribute("aria-label").split(" ")[-2..-1]
      DateTime.parse("#{month}/#{day}")
    end
  end
end
