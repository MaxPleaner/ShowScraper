class FreightAndSalvage
  MAIN_URL = "https://secure.thefreight.org/events?span=month&k=Shows"

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
      $driver.css(".tn-events-calendar__day").select do |event|
        event.css(".tn-events-calendar__event").any?
      end.uniq do |event|
        # for some reason they're all there twice.
        event.css(".tn-events-calendar__event")[0].attribute("href")
      end
    end

    def get_next_page
      # no idea why theres all these duplicate things but we need to get the third "next" button
      $driver.css(".tn-btn-datepicker__btn-period-prev-next--btn-next")[2].click
      sleep load_time
    end

    def parse_event_data(event, &foreach_event_blk)
      link = event.css(".tn-events-calendar__event")[0].attribute("href")
      date = parse_date(event)
      $driver.new_tab(link) do
        {
          date: date,
          img: $driver.css(".tn-prod-season-header__image")[0]&.attribute("src") || "",
          title: $driver.css(".the-title")[0]&.text || $driver.title,
          url: $driver.current_url,
          details: $driver.css(".tn-prod-season-header__description-text-content")[0]&.text || ""
        }
      end.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def parse_date(event)
      date_string = event.css("span").find do |span|
        span.attribute("id").include?("tn-events-day-cell")
      end.text
      DateTime.parse(date_string)
    end
  end
end
