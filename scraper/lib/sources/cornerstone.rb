class Cornerstone
  # No pagination needed here, all events shown at once.
  MAIN_URL = "https://cornerstoneberkeley.com/music-venue/"

  cattr_accessor :events_limit
  self.events_limit = 200

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    get_events.each.with_index.map do |event, index|
      next if index >= events_limit
      parse_event_data(event, &foreach_event_blk)
    end.compact
  end

  class << self
    private

    def get_events
      $driver.navigate.to(MAIN_URL)
      $driver.css(".list-view-item")
    end

    def parse_event_data(event, &foreach_event_blk)
      link = event.css(".event-name a")[0].attribute("href")
      $driver.new_tab(link) do
        {
          date: parse_date($driver.css("[itemprop='startDate']")[0].text),
          title: parse_title,
          url: $driver.current_url,
          img: $driver.css("[itemprop='image']")[0]&.attribute("src") || "",
          details: $driver.css(".event-details")[0].text
        }
      end.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    end

    def parse_title
      title = $driver.css(".talent-list").map(&:text).reject(&:blank?).join(", ")
      title = title.present? ? title : $driver.css("input#eventname")[0]&.attribute("value")
      title = title.present? ? title : $driver.css(".event-h2[itemprop='name']")[0].text
      title || ""
    end

    def parse_date(date_string)
      DateTime.parse(date_string)
    end
  end
end
