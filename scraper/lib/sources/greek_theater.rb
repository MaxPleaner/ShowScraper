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
      $driver.css(".content-information")
    end

    def parse_event_data(event, &foreach_event_blk)
      link = event.css(".more-info")[0].attribute("href")
      {
        date: DateTime.parse(event.css("[itemprop='startDate']")[0].attribute("content")),
        title: parse_title(event),
        url: link,
        img: event.css(".wp-post-image")[0]&.attribute("src") || "",
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def parse_date(date_string)
      DateTime.parse(date_string)
    end

    def parse_title(event)
      title = event.css(".show-title")[0].text
      support = event.css(".support")[0]&.text
      [title, support].compact.join(", ").gsub("\n", ", ")
    end
  end
end
