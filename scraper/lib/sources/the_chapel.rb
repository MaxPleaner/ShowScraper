class TheChapel
  # This scraper was recently updated from a calendar view to a paginated view.
  # Even though the URL says "calendar" it's not really a calendar.

  MAIN_URL = "https://thechapelsf.com/calendar/?sepage="

  cattr_accessor :events_limit, :load_time
  self.events_limit = 200
  self.load_time = 3

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    events = []
    i = 1
    get_page(i)

    loop do
      get_events.each do |event|
        next if events.count >= events_limit
        events.push(parse_event_data(event, &foreach_event_blk))
      end
      break if events.count >= events_limit
      i += 1
      got_next_page = get_page(i)
      break unless got_next_page
    end

    events.compact
  end

  class << self
    private

    def get_page(i)
      $driver.get(MAIN_URL + i.to_s)
    end

    def get_events
      $driver.css(".grid-item")
      # $driver.css(".calendar-day").select do |elem|
      #   elem.css("#event_tickets").any?
      # end
    end

    def parse_event_data(event, &foreach_event_blk)
      {
        date: parse_date(event),
        img: event.css(".seetickets-list-view-event-image")[0].attribute("src"),
        title: event.css(".title")[0].text,
        url: event.css(".title a")[0].attribute("href"),
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def parse_date(event)
      date_str = event.css(".date")[0].text
      month, day = date_str.split(" ")[1..2]
      DateTime.parse("#{month}/#{day}")
    end
  end
end
