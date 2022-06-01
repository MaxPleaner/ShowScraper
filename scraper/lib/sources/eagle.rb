class Eagle
  # Single page!!
  # They have a bunch of other stuff but it's all leather / kink / gay stuff
  # So I think it's ok to just get the "performance" category.
  # They only have rock shows every once in a while, anyway.
  MAIN_URL = "https://sf-eagle.com/mec-category/performance/"

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
      $driver.css(".mec-event-article")
    end

    def parse_event_data(event, &foreach_event_blk)
      {
        date: DateTime.parse(event.css(".mec-start-date-label")[0].text),
        img: event.css(".attachment-thumbnail")[0]&.attribute("src"),
        title: event.css(".mec-event-title")[0].text,
        url: event.css(".mec-color-hover")[0]&.attribute("href") || MAIN_URL,
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end
  end
end
