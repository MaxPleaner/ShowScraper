class Starline
  # Single page!!
  MAIN_URL = "https://starlinesocialclub.com/calendar/"

  cattr_accessor :events_limit, :load_time
  self.events_limit = 200
  self.load_time = 3

  # RIP Starline Social Club
  DISABLED=true

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    $driver.get(MAIN_URL)
    binding.pry
    get_events.map.with_index do |event, index|
      next if index >= events_limit
      parse_event_data(event, &foreach_event_blk)
    end.compact
  end

  class << self
    private

    def get_events
      $driver.css(".eventMainWrapper")
    end

    def parse_event_data(event, &foreach_event_blk)
      {
        date: DateTime.parse(event.css("#eventDate")[0].text),
        img: event.css(".eventListImage")[0].attribute("src"),
        title: event.css("#eventTitle")[0].text,
        url: event.css(".eventMoreInfo a")[0].attribute("href"),
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end
  end
end
