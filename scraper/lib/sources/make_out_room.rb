class MakeOutRoom

  # Calendar view, but without images or detail pages.
  # The calendar is rendered in an iframe, which we must access directly
  MAIN_URL = "https://www.calendarwiz.com/calendars/calendar.php?crd=makeoutroom"

  cattr_accessor :months_limit, :events_limit, :load_time
  self.months_limit = 3
  self.events_limit = 200
  self.load_time = 2

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    events = []
    $driver.get(MAIN_URL)
    sleep load_time
    months_limit.times do |i|
      new_events = get_events
      new_events.each do |event|
        next if events.count >= events_limit
        # parse_event_data returns an array here because there
        # can be multiple days per cell
        events.concat(parse_event_data(event, &foreach_event_blk))
      end
      break if events.count >= events_limit
      get_next_page unless i == months_limit - 1
    end
    events.compact
  end

  class << self
    private

    def get_events
      $driver.css("td").select { |cell| cell.attribute("data-day") }
    end

    def get_next_page
      $driver.css("[title='Go to next month']")[0].click
    end

    def parse_event_data(event, &foreach_event_blk)
      event.css("a").map do |_event|
        title = _event.text.split("~")[0]
        next if title.include?("Sorry, we're temporarily CLOSED on Mondays.")
        {
          date: parse_date(event),
          title: title,
          url: MAIN_URL,
          img: "",
          details: _event.text.split("~")[1..-1].join("~")
        }.
          tap { |data| Utils.print_event_preview(self, data) }.
          tap { |data| foreach_event_blk&.call(data) }
      end
    end

    def parse_date(event)
      day = event.attribute("data-day")
      month = event.attribute("data-month")
      year = event.attribute("data-year")
      date_str = [day, month, year].join("-")
      DateTime.parse(date_str, "DD-MM-YYYY")
    end
  end
end
