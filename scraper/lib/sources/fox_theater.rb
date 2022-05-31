class FoxTheater
  # Single page!!
  MAIN_URL = "https://thefoxoakland.com/listing/"

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
      $driver.css(".detail-information")
    end

    def parse_event_data(event, &foreach_event_blk)
      {
        date: DateTime.parse(event.css(".date-show")[0].attribute("content")),
        img: event.css(".wp-post-image")[0].attribute("src"),
        title: parse_title(event),
        url: event.css(".content-information a")[0].attribute("href"),
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    end

    def parse_title(event)
      headliner = event.css(".show-title")[0].text
      support = event.css(".support")[0]&.text

      [headliner, support].compact.join(", ").gsub("\n", ", ")
    end
  end
end
