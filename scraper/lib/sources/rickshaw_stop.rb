class RickshawStop
  # Awesome calendar which shows multiple months at once!
  MAIN_URL = "https://rickshawstop.com/calendar/"

  cattr_accessor :events_limit, :load_time
  self.events_limit = 200
  self.load_time = 3

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    $driver.get(MAIN_URL)
    get_events.map.with_index do |(month_node, event), index|
      next if index >= events_limit
      parse_event_data(month_node, event, &foreach_event_blk)
    end.compact
  end

  class << self
    private

    def get_events
      # resize the window so we get the better-organized calendar view
      max_width, max_height = $driver.execute_script("return [window.screen.availWidth, window.screen.availHeight];")
      $driver.manage.window.resize_to(2000, max_height)
      month_groups = $driver.css(".seetickets-calendar")
      month_headers = $driver.css(".seetickets-calendar-year-month-container")
      month_groups.flat_map.with_index do |month_group, idx|
        events = month_group.css(".seetickets-calendar-event-container")
        month = month_headers[idx]
        events.map { |event| [month, event] }
      end
    end

    def parse_event_data(month_node, event, &foreach_event_blk)
      month, year = month_node.text.split(" ")
      day = event.parent.css(".date-number")[0].text.to_i
      {
        date: DateTime.parse("#{month} #{day}, #{year}"),
        img: event.css(".seetickets-calendar-event-picture").map { |x| x.attribute("src") }.compact.first,
        title: event.css(".title")[0].text,
        url: event.css(".title a")[0].attribute("href"),
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end
  end
end
