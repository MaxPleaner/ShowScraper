class WyldflowrArts
  MAIN_URL = "https://wyldflowrarts.com/events"

  cattr_accessor :events_limit, :load_time
  self.events_limit = 200
  self.load_time = 3

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    $driver.get(MAIN_URL)
    sleep(load_time)
    
    # Switch to iframe context once
    iframe = $driver.find_element(css: "iframe")
    $driver.switch_to.frame(iframe)
    
    # Get and parse events while in iframe context
    results = get_events.map.with_index do |event, index|
      next if index >= events_limit
      parse_event_data(event, &foreach_event_blk)
    end.compact
    
    # Switch back to main context
    $driver.switch_to.default_content
    
    results
  end

  class << self
    private

    def get_events
      # Already in iframe context - just get the events
      $driver.css(".legacy-card")
    end

    def parse_event_data(event, &foreach_event_blk)
      # Already in iframe context - parse the event
      {
        date: parse_date(event),
        img: parse_img(event),
        title: parse_title(event),
        url: parse_url(event),
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def parse_title(event)
      event.css(".info h1")[0].text.strip
    end

    def parse_url(event)
      event.css(".info a")[0].attribute("href")
    end

    def parse_img(event)
      event.css("img")[0].attribute("src")
    end

    def parse_date(event)
      DateTime.parse event.css(".legacy-date span")[0].text
    end
  end
end

