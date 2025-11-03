class Paramount
  MAIN_URL = "https://www.paramountoakland.org/events"

  cattr_accessor :months_limit, :events_limit, :load_time
  self.events_limit = 200
  self.load_time = 2

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    events = []

    $driver.get(MAIN_URL)
    sleep self.load_time
    $driver.css("[aria-label='Toggle to List View']")[0].click

    loop do
      got_next_page = get_next_page
      break unless got_next_page
    end

    get_events.each do |event|
      next if events.count >= events_limit
      result = parse_event_data(event, &foreach_event_blk)
      events.push(result) if result.present?
    end

    events
  end

  class << self
    private

    def get_events
      $driver.css(".eventItem")
    end

    def get_next_page
      btn = $driver.css("#loadMoreEvents")[0]
      if btn.attribute("disabled")
        return false
      end
      btn.click
      sleep 1
      true
    end

    def parse_event_data(event, &foreach_event_blk)
      {
        url: event.css(".title a")[0].attribute("href"),
        img: event.css(".thumb img")[0].attribute("src"),
        date: parse_date(event),
        title: event.css(".title")[0].text,
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def parse_date(event)
      month = event.css(".m-date__month")[0].text
      day = event.css(".m-date__day")[0].text
      year = event.css(".m-date__year")[0].text
      DateTime.parse("#{month} #{day}, #{year}")
    end
  end
end
