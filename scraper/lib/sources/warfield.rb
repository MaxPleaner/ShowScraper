class Warfield
  # "Load more" type site

  cattr_accessor :pages_limit, :events_limit
  self.pages_limit = 5
  self.events_limit = 200

  MAIN_URL = "https://www.thewarfieldtheatre.com/events"

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    $driver.navigate.to(MAIN_URL)

    # We just spam the auto loader until everything's there.
    pages_limit.times { get_next_page; sleep 1 }

    get_events.map.with_index do |event, index|
      next if index >= events_limit
      parse_event_data(event, &foreach_event_blk)
    end.compact
  end

  class << self
    private

    def get_events
      $driver.css(".thumb a")
    end

    def get_next_page
      $driver.css("#loadMoreEvents")[0].click
    end

    def parse_event_data(event, &foreach_event_blk)
      link = event.attribute("href")
      $driver.new_tab(link) do
        {
          date: parse_date($driver.css(".date")[0].text.split("\n")[1]),
          url: $driver.current_url,
          img: $driver.css(".event_image img")[0].attribute("src"),
          title: $driver.css(".page_header_container h1,h4").map(&:text).join(" "),
          details: ($driver.css(".bio")[0]&.text || "").gsub("ARTIST INFORMATION\n", "").gsub("\nREAD MORE", ""),
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
