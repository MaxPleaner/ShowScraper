class HotelUtah
  # No pagination needed here, all events shown at once.
  MAIN_URL = "https://www.eventbrite.com/o/hotel-utah-32823347267"

  cattr_accessor :events_limit
  self.events_limit = 200

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    get_events.each.with_index.map do |event, index|
      next if index >= events_limit
      parse_event_data(event, &foreach_event_blk)
    end.compact
  end

  class << self
    private

    def get_events
      $driver.navigate.to(MAIN_URL)
      $driver.css(".eds-card")
    end

    def parse_event_data(event, &foreach_event_blk)
      {
        date: DateTime.parse($driver.css(".eds-card")[0].css(".eds-event-card-content__sub-title")[0].text),
        url: event.css(".eds-event-card-content__action-link")[0].attribute("href"),
        img: event.css(".eds-event-card-content__image")[0]&.attribute("src") || "",
        title: event.css(".eds-event-card__formatted-name--is-clamped")[0].text,
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    end
  end
end
