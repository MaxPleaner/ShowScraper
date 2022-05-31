class Crybaby
  MAIN_URL = "https://crybaby.live/events/"

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
      $driver.css(".tw-section")
    end

    def parse_event_data(event, &foreach_event_blk)
      {
        date: parse_date(event),
        img: event.css(".tw-image img")[0].attribute("src"),
        title: event.css(".tw-name")[0].text,
        url: event.css(".tw-image a")[0].attribute("href"),
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    end

    def parse_date(event)
      # TODO no year
      DateTime.parse(event.css(".tw-event-date")[0].text)
    end
  end
end
