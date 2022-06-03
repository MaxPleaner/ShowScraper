class RickshawStop
  # Awesome calendar which shows multiple months at once!
  # However it ended up not being easy to scrape because it uses multiple
  # hosts for detail pages.
  MAIN_URL = "https://rickshawstop.com/calendar/"

  cattr_accessor :events_limit, :load_time
  self.events_limit = 200
  self.load_time = 3

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    $driver.get(MAIN_URL)
    index = 0
    get_events.map do |event|
      next if index >= events_limit
      result = parse_event_data(event, &foreach_event_blk)
      index += 1 if result
      result
    end.compact
  end

  class << self
    private

    def get_events
      $driver.css(".calendar-day-event").select do |event|
        event.css("#event_tickets").any?
      end
    end

    def parse_event_data(event, &foreach_event_blk)
      link = event.css("#event_tickets")[0].attribute("href")
      date = DateTime.parse(event.css(".value-title")[0].text)
      img = event.css(".detail_seetickets_image img")[0].attribute("src")
      title = event.css(".event-title")[0].text
      {
        date: date,
        img: img,
        title: title,
        url: link,
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) if data }.
        tap { |data| foreach_event_blk&.call(data) if data }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end
  end
end
