class FreightAndSalvage
  MAIN_URL = "https://thefreight.org/shows/"

  cattr_accessor :events_limit, :load_time
  self.events_limit = 200
  self.load_time = 2

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    events = []
    $driver.get(MAIN_URL)
    events = []
    get_events.each do |event|
      next if events.count >= events_limit
      result = parse_event_data(event, &foreach_event_blk)
      events.push(result) if result
    end.compact
    events
  end

  class << self
    private

    def get_events
      $driver.css(".list-view-item")
    end

    def parse_event_data(event, &foreach_event_blk)
      # binding.pry
      {
        date: DateTime.parse(event.css(".dates")[0].text),
        img: event.css(".wp-post-image")[0].attribute("src"),
        title: event.css(".event-name")[0].text,
        url: event.css(".event-name a")[0].attribute("href"),
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end
  end
end
