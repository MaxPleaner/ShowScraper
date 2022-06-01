class Bimbos
  # Single page!!
  MAIN_URL = "https://bimbos365club.com/shows/"

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
      $driver.css(".tw-section")
    end

    def parse_event_data(event, &foreach_event_blk)
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
      [name1, name2].compact.join(", ")
    end

    def parse_date(event)
      # TODO: no year
      month = event.css(".tm-event-month")[0].text
      day = event.css(".tm-event-date")[0].text
      DateTime.parse("#{month} #{day}")
    end
  end
end
