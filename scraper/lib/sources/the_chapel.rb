class TheChapel
  # Awesome calendar which shows multiple months at once!
  MAIN_URL = "https://thechapelsf.com/calendar/"

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
      $driver.css(".calendar-day").select do |elem|
        elem.css("#event_tickets").any?
      end
    end

    def parse_event_data(event, &foreach_event_blk)
      {
        date: DateTime.parse(event.css(".date")[0].text),
        img: event.css(".detail_seetickets_image img")[0].attribute("src"),
        title: event.css(".event-title")[0].text,
        url: event.css("#event_tickets")[0].attribute("href"),
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end
  end
end
