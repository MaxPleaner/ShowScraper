class GreatNorthern
  # Single page!!
  MAIN_URL = "https://www.thegreatnorthernsf.com/shows"

  cattr_accessor :events_limit, :load_time
  self.events_limit = 200
  self.load_time = 3

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    $driver.get(MAIN_URL)

    # the whole fn calendar is in an iframe ... lovely
    sleep self.load_time
    $driver.navigate.to $driver.css("iframe")[0].attribute("src")
    sleep self.load_time

    get_events.map.with_index do |event, index|
      next if index >= events_limit
      parse_event_data(event, &foreach_event_blk)
    end.compact
  end

  class << self
    private

    def get_events
      $driver.css(".event.row")
    end

    def parse_event_data(event, &foreach_event_blk)
      {
        date: DateTime.parse(event.css(".date")[0].text),
        img: event.css(".logo img")[0].attribute("src"),
        title: event.css(".title")[0].text,
        url: event.css(".title a")[0].attribute("href"),
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end
  end
end
