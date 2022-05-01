class GoldenBull
  MAIN_URL = "https://goldenbullbar.com/shows" # this performs an internal redirect
  MONTHS_LIMIT = 3

  # Full calendar view type site
  CALENDAR_LOAD_TIME = 2 # will sleep this many seconds after opening calendar

  def self.run
    events = []
    $driver.get(MAIN_URL)
    MONTHS_LIMIT.times do |i|
      events.concat(
        get_events.map { |event| parse_event_data(event) }
      )
      get_next_page unless i == MONTHS_LIMIT - 1
    end
    events
  end

  class << self
    private

    def get_events
      sleep CALENDAR_LOAD_TIME
      $driver.css(".Main-content .background-image-link")
    end

    def get_next_page
      $driver.css("[aria-label='Go to next month']")[0].click
    end

    def parse_event_data(event)
      {
        url: event.attribute("href"),
        img: event.css("img")[0].attribute("src"),
      }.tap do |data|
        $driver.new_tab(data[:url]) do
          data[:date] = parse_date($driver.css("time.event-date")[0].text)
          data[:title] = $driver.css(".eventitem-title")[0].text
          data[:details] = $driver.css(".sqs-block-content")[0].text
        end
      end
    end

    def parse_date(date_string)
      # TODO: also parse time, the data is available.
      DateTime.parse(date_string)
    end
  end
end
