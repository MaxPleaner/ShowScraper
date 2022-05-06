class Fillmore
  # "Load more" type site
  # However they have aggressive bot detection.
  # So we just parse super minimal info here.

  cattr_accessor :pages_limit, :events_limit
  self.pages_limit = 5
  self.events_limit = 200

  MAIN_URL = "https://www.livenation.com/venue/KovZpZAE6eeA/the-fillmore-events"

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    $driver.navigate.to(MAIN_URL)

    # We just spam the auto loader until everything's there.
    get_all_pages

    get_events.map.with_index do |event, index|
      next if index >= events_limit
      parse_event_data(event, &foreach_event_blk)
    end.compact
  end

  class << self
    private

    def get_events
      $driver.css(".listing__item__link")
    end

    def get_all_pages
      # ewww gross iframe
      $driver.execute_script 'document.querySelectorAll("iframe").forEach((iframe) => iframe.remove())'

      # And google ads ... livenation, everyone
      $driver.execute_script 'document.querySelectorAll("#adhesion-ad").forEach((iframe) => iframe.remove())'

      while load_more = $driver.css(".show-more")[0]
        load_more.click
      end
    end

    def parse_event_data(event, &foreach_event_blk)
      {
        date: DateTime.parse(event.css("time")[0].attribute("datetime")),
        url: event.attribute("href"),
        img: parse_img(event),
        title: event.css("header h3")[0].text,
        details: "",
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    end

    def parse_img(event)
      # The images don't actually load until we scroll to them, I guess?
      img = event.css("img")[0].attribute("src")
      if img.include?("data")
        $driver.execute_script("window.scrollBy(0,500)")
        img = event.css("img")[0].attribute("src")
      end
      img
    end
  end
end