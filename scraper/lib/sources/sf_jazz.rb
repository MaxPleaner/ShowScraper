class SfJazz
  MAIN_URL = "https://www.sfjazz.org/calendar/"

  cattr_accessor :months_limit, :events_limit
  self.events_limit = 200

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    events = []
    $driver.get(MAIN_URL)
    loop do
      get_events.each do |event|
        next if events.count >= events_limit
        events.push(parse_event_data(event, &foreach_event_blk))
      end
      break if events.count >= events_limit
    end
    events
  end

  class << self
    private

    def get_events
      # scroll down so all the data is loaded
      3.times do
        $driver.execute_script("window.scrollBy(0,document.body.scrollHeight)")
      end
      sleep 2

      $driver.css(".calendar-list-view-event-container")
    end

    def parse_event_data(event, &foreach_event_blk)
      date = parse_date(event) rescue return
      {
        url: event.css("a.event-image")[0].attribute("href"),
        img: event.css(".event-image img")[0].attribute("src"),
        date: date,
        title: event.css(".event-info-title")[0].text.gsub("\n", " "),
        details: ""
      }.
      tap { |data| Utils.print_event_preview(self, data) }.
      tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def parse_date(event)
      month = event.css(".event-date-month")[0].text
      day = event.css(".event-date-date")[0].text
      DateTime.parse("#{month}/#{day}")
    end
  end
end
