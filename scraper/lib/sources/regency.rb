class Regency
  # No pagination needed here, all events shown at once.
  MAIN_URL = "https://www.theregencyballroom.com/events/all"

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
      $driver.css("#eventsList .entry .thumb a")
    end

    def parse_event_data(event, &foreach_event_blk)
      link = event.attribute("href")
      $driver.new_tab(link) do
        {
          date: DateTime.parse($driver.css(".date")[0].text.gsub("DATE\n", "")),
          url: $driver.current_url,
          img: $driver.css(".event_image img")[0].attribute("src"),
          title: $driver.css(".page_header_left")[0].text.gsub("\n", " ").gsub("Goldenvoice Presents ", ""),
          details: ""
        }
      end.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end
  end
end
