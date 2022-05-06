class UCBerkeleyTheater
  # No pagination needed here, all events shown at once.
  MAIN_URL = "https://theuctheatre.org/events"

  cattr_accessor :events_limit, :load_time
  self.events_limit = 200
  self.load_time = 2

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
      $driver.css(".eventListings li a").select do |event|
        event.text == "MORE INFO"
      end
    end

    def parse_event_data(event, &foreach_event_blk)
      link = event.attribute("href")
      $driver.new_tab(link) do
        {
          date: DateTime.parse($driver.css(".ed-title .date")[0].text),
          url: $driver.current_url,
          title: $driver.css(".eventName2")[0].text,
          img: $driver.css(".ed-img")[0].attribute("src"),
          details: $driver.css("#ed-desc")[0].text
        }
      end.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    end
  end
end
