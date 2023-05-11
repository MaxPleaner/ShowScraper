class IvyRoom
  MAIN_URL = "https://www.ivyroom.com/calendar?view=calendar"

  cattr_accessor :months_limit, :events_limit, :load_time
  self.months_limit = 1
  self.events_limit = 200
  self.load_time = 2

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    events = []
    $driver.get(MAIN_URL)
    get_events.each do |event|
      next if events.count >= events_limit
      events.push(parse_event_data(event, &foreach_event_blk))
    end
    events
  end

  class << self
    private

    def get_events
      sleep load_time
      $driver.css(".event-card")
    end

    def parse_event_data(event, &foreach_event_blk)
      {
        # links are done here through modals, not standalone links
        url: $driver.current_url,
        img: parse_img(event),
        date: DateTime.parse(event.css(".time-info")[0].text),
        title: [".event-name", ".support"].map { |c| event.css(c)[0].text }.compact.join(", "),
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def parse_img(event)
      style = event.css(".main-img")[0].attribute("style")
      style.split("background-image: url(\"")[1].split("\");")[0]
    end

  end
end
