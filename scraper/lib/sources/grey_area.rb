class GreyArea
  # No pagination needed here, all events shown at once.
  MAIN_URL = "https://grayarea.org/events/"

  cattr_accessor :events_limit
  self.events_limit = 200

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    get_events.each.map.with_index do |event, index|
      next if index >= events_limit
      parse_event_data(event, &foreach_event_blk)
    end.reject(&:blank?)
  end

  class << self
    private

    def get_events
      $driver.navigate.to(MAIN_URL)
      $driver.css(".featured-items")[0].css(".item-link")
    end

    def parse_event_data(event, &foreach_event_blk)
      $driver.new_tab(event.attribute("href")) do
        # we have to check this here because there's a redirect
        if $driver.current_url.include?("/event/")
          {
            img: parse_img,
            title: $driver.css("h2.heading")[0]&.text || $driver.title,
            url: $driver.current_url,
            date: parse_date($driver.css(".meta-date")[0].text),
            details: $driver.css(".body-text").map(&:text).join("\n")
          }.
            tap { |data| Utils.print_event_preview(self, data) }.
            tap { |data| foreach_event_blk&.call(data) }
        else
          {}
        end
      end
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def parse_img
      style = $driver.css(".full-width-image .image")[0]&.attribute("style")
      return "" unless style
      style.scan(/url\(\"(.+)\"\)/)[0][0]
    end

    def parse_date(date_string)
      DateTime.parse(date_string)
    end
  end
end
