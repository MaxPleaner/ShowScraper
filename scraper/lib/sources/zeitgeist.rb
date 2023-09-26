class Zeitgeist
  # No pagination needed here, all events shown at once.
  MAIN_URL = "https://www.zeitgeistsf.com/events"

  cattr_accessor :events_limit
  self.events_limit = 200

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    get_events.each_with_index.map do |event, index|
      next if index >= events_limit
      parse_event_data(event, &foreach_event_blk)
    end.compact
  end

  class << self
    private

    def get_events
      $driver.navigate.to(MAIN_URL)
      $driver.css("[data-hook='side-by-side-item']")
    end

    def parse_event_data(event, &foreach_event_blk)
      {
        img: event.css("img")&.first&.attribute("src"),
        title: event.css("[data-hook='title']")[0].text,
        date: parse_date(event.css("[data-hook='date']")[0].text),
        url: event.css("[data-hook='ev-rsvp-button']")[0].attribute("href"),
        details: event.css("[data-hook='description']")[0]&.text || "",
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def parse_date(date_string)
      # TODO: missing year!
      DateTime.parse(date_string.split(",")[0])
    end
  end
end
