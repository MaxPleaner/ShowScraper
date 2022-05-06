class Winters
  MAIN_URL = "https://winterstavern.com/live-music-calendar/"

  cattr_accessor :months_limit, :events_limit
  self.months_limit = 3
  self.events_limit = 200

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    events = []
    $driver.get(MAIN_URL)
    months_limit.times do |i|
      get_events.each do |event|
        next if events.count >= events_limit
        events.push(parse_event_data(event, &foreach_event_blk))
      end
      break if events.count >= events_limit
      get_next_page unless i == months_limit - 1
    end
    events
  end

  class << self
    private

    def get_events
      sleep 2
      $driver.css(".fc-day-grid-event")
    end

    def get_next_page
      $driver.css(".fc-next-button")[0].click
    end

    def parse_event_data(event, &foreach_event_blk)
      $driver.new_tab(event.attribute("href")) do
        {
          url: $driver.current_url,
          img: $driver.css(".featured-image img")[0].attribute("src"),
          date: DateTime.parse($driver.css("time")[0].attribute("datetime")),
          title: $driver.css(".entry-title")[0].text,
          details: ""
        }
      end.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    end
  end
end
