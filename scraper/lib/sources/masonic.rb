class Masonic
  # "Load more" type site
  # However they have aggressive bot detection.
  # So we just parse super minimal info here.

  cattr_accessor :pages_limit, :events_limit
  self.pages_limit = 5
  self.events_limit = 200

  MAIN_URL = "https://www.livenation.com/venue/KovZpZAJ6nlA/the-masonic-events"

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    $driver.navigate.to(MAIN_URL)

    # We just spam the auto loader until everything's there.
    # get_all_pages
    sleep 2

    get_events.map.with_index do |event, index|
      next if index >= events_limit
      parse_event_data(event, &foreach_event_blk)
    end.compact
  end

  class << self
    private

    def get_events
      $driver.css("div[role='group']")
      # $driver.css(".listing__item__link")
    end

    def get_all_pages
      sleep 2

      # ewww gross iframe
      $driver.execute_script 'document.querySelectorAll("iframe").forEach((iframe) => iframe.remove())'

      # And google ads ... livenation, everyone
      $driver.execute_script 'document.querySelectorAll("#adhesion-ad").forEach((iframe) => iframe.remove())'

      while load_more = $driver.css(".show-more")[0]
        load_more.click
        sleep 1
      end
      $driver.execute_script("window.scrollBy(0,document.body.scrollHeight)")
    end

    def parse_event_data(event, &foreach_event_blk)
      time = event.css("time")[0]
      return unless time
      {
        date: DateTime.parse(time.attribute("datetime")),
        url: event.css("a")[0].attribute("href"),
        img: parse_img(event),
        title: event.css(".chakra-heading")[0].text,
        details: "",
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def parse_img(event)
      # Some wierd shit. The images don't load until you scroll to them.
      # But there's a workaround.
      img = event.css("img")[0].attribute("src")
      if img.include?("data")
        img = event.attribute("outerHTML").scan(/srcSet="([^"]+)"/)[0][0].split(",")[6].lstrip
      end
      img
    rescue => e
      puts "<skipping image>"
      ""
    end
  end
end
