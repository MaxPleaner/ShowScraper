class ElRio
  # This is the iframe rendered from "https://www.elriosf.com/calendar"
  MAIN_URL = "https://tockify.com/elriosf2/agenda"

  cattr_accessor :events_limit, :load_time
  self.events_limit = 200
  self.load_time = 3

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    events = []
    $driver.get(MAIN_URL)
    get_all_pages
    get_events.map do |event|
      next if events.count >= events_limit
      events.push(parse_event_data(event, &foreach_event_blk))
      break if events.count >= events_limit
    end
    events
  end

  class << self
    private

    def get_all_pages
      # binding.pry
      4.times do
        sleep 2
        load_more = $driver.css(".btn-loadMore")[0]
        return unless load_more
        load_more.click rescue next
      end
    end

    def get_events
      $driver.css(".agendaItem")
    end

    def parse_event_data(event, &foreach_event_blk)
      {
        date: DateTime.parse(event.css(".d-when")[0].text),
        img: event.css(".agendaItem__image__img")[0].attribute("src"),
        title: event.css(".d-title")[0].text,
        url: event.css(".d-title a")[0].attribute("href"),
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end
  end
end
