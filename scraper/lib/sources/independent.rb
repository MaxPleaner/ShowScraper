class Independent
  # Single page!!
  # Note, there is an older version of the calendar at /calendar
  # but it's a pain in the ass, so using this instead.
  MAIN_URL = "http://theindependentsf.com/"

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
      $driver.css(".tw-event-item")
    end

    def parse_event_data(event, &foreach_event_blk)
      return unless event.css(".tw-event-date")[0]
      {
        date: parse_date(event),
        img: event.css(".tw-image img")[0].attribute("src"),
        title: parse_title(event),
        url: event.css(".tw-image a")[0].attribute("href"),
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def parse_title(event)
      name1 = event.css(".tw-name")[0].text
      name2 = event.css(".tw-artist")[0]&.text
      [name1, name2].compact.map do |str|
        str.tr("\n", " ").strip
      end.join(", ")
    end

    def parse_date(event)
      # TODO: no year
      month, day = event.css(".tw-event-date")[0].text.split(".").map do |str|
        str.tr("\n ", "")
      end
      DateTime.parse("#{month}/#{day}")
    end
  end
end
