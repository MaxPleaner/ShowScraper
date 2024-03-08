class Amados
  # No pagination needed here, all events shown at once.
  MAIN_URL = "http://www.amadossf.com"

  cattr_accessor :events_limit
  self.events_limit = 200

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    $driver.navigate.to(MAIN_URL)
    $driver.execute_script("window.scrollBy(0, 500)")
    sleep 3

    # 5.times.flat_map do
      events = get_events.each.with_index.map do |event, index|
        next if index >= events_limit
        parse_event_data(event, &foreach_event_blk)
      end.compact
      # get_next_page
      # events
    # end
  end

  class << self
    private

    def get_events
      $driver.css("[data-aid='CALENDAR_SMALLER_SCREEN_CONTAINER']")
    end

    def get_next_page
      btns = $driver.css("[role='button']")
      btn = btns.find { |btn| btn.text.include?("More") }
      btn.click
    end

    def parse_event_data(event, &foreach_event_blk)
      date = parse_date(event) rescue return
      {
        date: date,
        url: "https://amadossf.com/",
        img: "",
        title: event.css("[data-aid='CALENDAR_EVENT_TITLE']")[0].text,
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def parse_date(event)
      DateTime.parse  event.css("[data-aid='CALENDAR_EVENT_DATE']")[0].text
    end
  end
end
