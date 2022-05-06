class GreekTheater
  # No pagination needed here, all events shown at once.
  MAIN_URL = "https://thegreekberkeley.com/event-listing/"

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
      $driver.css(".more-info")
    end

    def parse_event_data(event, &foreach_event_blk)
      link = event.attribute("href")
      $driver.new_tab(link) do
        {
          date: parse_date($driver.css(".single-date-show")[0].text),
          title: $driver.css(".show-title,.support").map(&:text).join(", ").gsub("\n", " "),
          url: $driver.current_url,
          img: $driver.css(".wp-post-image")[0].attribute("src"),
          details: $driver.css(".attraction-list")[0].text
        }
      end.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    end

    def parse_date(date_string)
      DateTime.parse(date_string)
    end
  end
end
