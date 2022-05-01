class ElboRoom
  # No pagination needed here, all events shown at once.
  MAIN_URL = "https://www.elboroomjacklondon.com/full-events-listing"

  cattr_accessor :events_limit
  self.events_limit = 200

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    get_events.each_index.map do |index|
      next if index >= events_limit
      parse_event_data(index, &foreach_event_blk)
    end.compact
  end

  class << self
    private

    def get_events
      $driver.navigate.to(MAIN_URL)
      $driver.css("[data-hook='title'] a")
    end

    def parse_event_data(index, &foreach_event_blk)
      $driver.new_tab(MAIN_URL) do
        $driver.css("[data-hook='title'] a")[index].click
        {
          date: parse_date($driver.css("[data-hook='event-full-date']")[0].text),
          url: $driver.current_url,
          title: $driver.css("[data-hook='event-title']")[0].text,
          img: $driver.css("[data-hook='event-image'] img")[0].attribute("src"),
          details: $driver.css("[data-hook='event-description']")[0].text,
        }
      end.
        tap { |data| pp(data) if ENV["PRINT_EVENTS"] == "true" }.
        tap { |data| foreach_event_blk&.call(data) }
    end

    def parse_date(date_string)
      # TODO: figure out how to handle year since this date string doesnt include it
      DateTime.parse(date_string)
    end
  end
end
