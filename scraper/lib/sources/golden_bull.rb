class GoldenBull
  MAIN_URL = "https://goldenbullbar.com/shows" # this performs an internal redirect

  cattr_accessor :months_limit, :events_limit, :load_time
  self.months_limit = 3
  self.events_limit = 200
  self.load_time = 2

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
      $driver.css(".Main-content .background-image-link")
    end

    def get_next_page
      $driver.css("[aria-label='Go to next month']")[0].click
    end

    def parse_event_data(event, &foreach_event_blk)
      {
        url: event.attribute("href"),
        img: event.css("img")[0].attribute("src"),
      }.tap do |data|
        $driver.new_tab(data[:url]) do
          data[:date] = parse_date($driver.css("time.event-date")[0].text)
          data[:title] = $driver.css(".eventitem-title")[0].text
          data[:details] = $driver.css(".sqs-block-content")[0].text
        end
      end.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    end

    def parse_date(date_string)
      # TODO: also parse time, the data is available.
      DateTime.parse(date_string)
    end
  end
end
