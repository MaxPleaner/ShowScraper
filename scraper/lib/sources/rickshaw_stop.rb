class RickshawStop
  # Awesome calendar which shows multiple months at once!
  # However it ended up not being easy to scrape because it uses multiple
  # hosts for detail pages.
  MAIN_URL = "https://rickshawstop.com/calendar/"

  cattr_accessor :events_limit, :load_time
  self.events_limit = 200
  self.load_time = 3

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    $driver.get(MAIN_URL)
    get_events.map.with_index do |event, index|
      next if index >= events_limit
      fallback_date = DateTime.parse(event.css(".value-title")[0].text)
      fallback_img = $driver.css(".detail_seetickets_image img")[0].attribute("src")
      parse_event_data(event, fallback_date, fallback_img, &foreach_event_blk)
    end.compact
  end

  class << self
    private

    def get_events
      $driver.css(".calendar-day-event").select do |event|
        event.css("#event_tickets").any?
      end
    end

    def parse_event_data(event, fallback_date, fallback_img, &foreach_event_blk)
      link = event.css("#event_tickets")[0].attribute("href")
      $driver.new_tab(link) do
        if $driver.current_url.include?("eventbrite")
          {
            date: DateTime.parse($driver.css(".event-details__data meta")[0].attribute("content")),
            img: $driver.css(".listing-hero-image")[0].attribute("src"),
            title: $driver.title,
            url: $driver.current_url,
            details: $driver.css("[data-automation='about-this-event-sc']")[0].text
          }
        elsif $driver.current_url.include?("wl.seetickets.us")
          title = $driver.css("[itemprop='name']")[0].text
          if title != "PRIVATE EVENT"
            {
              date: DateTime.parse($driver.css("[itemprop='startDate']")[0].attribute("datetime")),
              img: $driver.css("[itemprop='image']")[0].attribute("src"),
              title: title,
              url: $driver.current_url,
              details: $driver.css(".event-details")[0].text
            }
          end
        else
          # There are other event sources here (e.g. rav.co, possibly more)
          # rav.co is not semantic css. We can't reliably scrape this.
          # However we can use some fallback
          {
            date: fallback_date,
            title: $driver.title,
            img: fallback_img,
            url: $driver.current_url,
            details: ""
          }
        end
      end.
        tap { |data| Utils.print_event_preview(self, data) if data }.
        tap { |data| foreach_event_blk&.call(data) if data }
    rescue => e
      binding.pry
    end
  end
end
