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
      $driver.css(".tn-events-calendar__event").uniq do |link|
        link.attribute("href")
      end # for some reason they're all there twice.
    end

    def get_next_page
      # no idea why theres all these duplicate things but we need to get the third "next" button
      $driver.css(".tn-btn-datepicker__btn-period-prev-next--btn-next")[2].click
    end

    def parse_event_data(event, &foreach_event_blk)
      link = event.attribute("href")
      $driver.new_tab(link) do
        {
          date: parse_date($driver.css(".the-date")[0].text),
          img: $driver.css(".tn-prod-season-header__image")[0].attribute("src"),
          title: $driver.css(".the-title")[0].text,
          url: $driver.current_url,
          details: $driver.css(".tn-prod-season-header__description-text-content")[0].text
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
