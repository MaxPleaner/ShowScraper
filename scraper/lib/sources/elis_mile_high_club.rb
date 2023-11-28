class ElisMileHighClub

  MAIN_URL = "https://www.elismilehighclub.com/"

  cattr_accessor :months_limit, :events_limit, :load_time
  # self.months_limit = 3
  self.events_limit = 200
  self.load_time = 2

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    events = []
    $driver.get(MAIN_URL)
    sleep load_time
    new_events = get_events
    new_events.each do |event|
      next if events.count >= events_limit
      events.push(parse_event_data(event, &foreach_event_blk))
    end
    events.compact
  end

  class << self
    private

    def get_events
      $driver.css("[data-hook='events-card']")
    end

    def parse_event_data(event, &foreach_event_blk)
      date = parse_date(event) rescue return
      {
        date: date,
        title: event.css("[data-hook='title']")[0].text,
        url: event.css("[data-hook='ev-rsvp-button']")[0].attribute("href"),
        img: event.css("[data-hook='image'] img")[1].attribute("src"),
        details: ""
      }.
        tap { |data| }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def parse_date(event)
      DateTime.parse event.css("[data-hook='short-date']")[0].text
    end
  end
end
