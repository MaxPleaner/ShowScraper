class Starline
  # Single page!!
  MAIN_URL = "https://starlinesocialclub.com/calendar/"

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
      $driver.css(".eventMainWrapper .eventMoreInfo a")
    end

    def parse_event_data(event, &foreach_event_blk)
      link = event.attribute("href")
      $driver.new_tab(link) do
        {
          date: parse_date($driver.css(".eventStDate")[0].text),
          img: $driver.css(".singleEventImage.wp-post-image")[0].attribute("src"),
          title: $driver.css("#eventTitle")[0].text,
          url: $driver.current_url,
          details: $driver.css(".singleEventDescription")[0].text
        }
      end.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    end

    def parse_date(date_string)
      # TODO: no year
      DateTime.parse(date_string)
    end
  end
end
