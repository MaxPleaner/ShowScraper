class GoldenBull
  MAIN_URL = "https://goldenbullbar.com/shows" # this performs an internal redirect

  cattr_accessor :months_limit, :events_limit, :load_time
  self.months_limit = 3
  self.events_limit = 200
  self.load_time = 2

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    events = []
    $driver.get(MAIN_URL)
    months_limit.times do |i|
      get_events.map do |event|
        next if events.count >= events_limit
        events.push(parse_event_data(event, &foreach_event_blk))
      end
      break if events.count >= events_limit
      got_next_page = get_next_page unless i == months_limit - 1
      break if !got_next_page
    end
    events
  end

  class << self
    private

    def get_events
      sleep load_time
      $driver.css(".eventlist-event")
    end

    def get_next_page
      $driver.css("[aria-label='Go to next month']")[0]&.click
    end

    def parse_event_data(event, &foreach_event_blk)
      {
        url: event.css(".eventlist-title-link")[0].attribute("href"),
        img: event.css(".eventlist-column-thumbnail img")[0].attribute("src"),
        title: event.css(".eventlist-title-link")[0].text,
        date: DateTime.parse(event.css(".event-date")[0].text),
        details: "",
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end
  end
end
