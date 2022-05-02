class ElRio
  MAIN_URL = "https://tockify.com/elriosf2/monthly" # secret page from elriosf.com

  cattr_accessor :months_limit, :events_limit, :load_time
  self.months_limit = 3
  self.events_limit = 200
  self.load_time = 3

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    events = []
    $driver.get(MAIN_URL)
    months_limit.times do |i|
      get_events.map do |event|
        next if events.count >= events_limit
        events.push(parse_event_data(event, &foreach_event_blk))
      end
      break if events.count >= events_limit
      get_next_page unless i == months_limit - 1
    end
    events
  end

  class << self
    private

    def get_events
      sleep load_time
      $driver.css(".d-title")
    end

    def get_next_page
      $driver.css(".flaticon-next")[0].click rescue $driver.save_screenshot("debug.png")
    end

    def parse_event_data(event, &foreach_event_blk)
      link = event.attribute("href")
      $driver.new_tab(link) do
        {
          date: parse_date($driver.css(".d-when")[0].text),
          img: $driver.css(".d-text img")[0].attribute("src"),
          title: $driver.css("h1.d-headerText")[0].text,
          url: $driver.current_url,
          details: $driver.css(".eventDetail__what__description")[0].text
        }
      end.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    end

    def parse_date(date_string)
      DateTime.parse(date_string)
    end
  end
end
