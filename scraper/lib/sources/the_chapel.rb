class TheChapel
  # Awesome calendar which shows multiple months at once!
  MAIN_URL = "https://thechapelsf.com/calendar/"

  cattr_accessor :events_limit, :load_time
  self.events_limit = 200
  self.load_time = 3

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    $driver.get(MAIN_URL)
    get_events.map.with_index do |event, index|
      next if index >= events_limit
      parse_event_data(event, &foreach_event_blk)
    end.compact
  end

  class << self
    private

    def get_events
      $driver.css(".calendar-day").select do |elem|
        elem.css("#event_tickets").any?
      end
    end

    def parse_event_data(event, &foreach_event_blk)
      link = event.css("#event_tickets")[0].attribute("href")
      date = parse_date(event.css(".date")[0].text)
      $driver.new_tab(link) do
        {
          date: date,
          img: parse_img,
          title: parse_title,
          url: $driver.current_url,
          details: $driver.css(".event-details")[0]&.text || ""
        }
      end.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    end

    def parse_title
      $driver.css("[itemprop='name']")[0]&.text ||
        $driver.css("[data-automation='listing-event-description']")[0]&.text ||
        $driver.title
    end

    def parse_img
      $driver.css("[itemprop='image']")[0]&.attribute("src") ||
        $driver.css("img.listing-hero-image.listing-image--main")[0]&.attribute("src") ||
        ""
    end

    def parse_date(date_string)
      # TODO: get year :(
      Date.strptime(date_string.split(" ")[1], "%m.%d").to_datetime
    end
  end
end
