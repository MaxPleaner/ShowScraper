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
      $driver.css(".ue-li-container")
    end

    def parse_event_data(event, &foreach_event_blk)
      date = parse_date(event) rescue return
      {
        date: date,
        url: event.css("a").find { |link| link.text.upcase == "MORE INFO" }.attribute("href"),
        title: event.css("h2,h3").map(&:text).join(", ").gsub("\n", ", "),
        img: event.css("img")[0].attribute("src"),
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def parse_date(event)
      DateTime.parse(event.css(".ue-date")[0].text.split("\n").first(2).join(" "))
    end
  end
end
