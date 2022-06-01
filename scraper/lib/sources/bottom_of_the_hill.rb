class BottomOfTheHill
  # No pagination needed here, all events shown at once.
  MAIN_URL = "http://www.bottomofthehill.com/calendar.html"

  cattr_accessor :events_limit
  self.events_limit = 200

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    index = 0
    get_events.each.map do |event|
      next if index >= events_limit
      next if event.css(".date").empty? # they have non-events in the same table
      result = parse_event_data(event, &foreach_event_blk)
      index += 1 if result
      result
    end.compact
  end

  class << self
    private

    def get_events
      $driver.navigate.to(MAIN_URL)
      $driver.css("#listings tr")
    end

    def parse_event_data(event, &foreach_event_blk)
      {
        date: parse_date(event.css(".date").map(&:text).reject(&:blank?).first),
        img: parse_img(event) || "",
      }.tap do |data|
        link = parse_details_link(event)
        $driver.new_tab(link) do
          data[:title] = $driver.title.gsub("bottomofthehill: ", "")
          data[:url] = $driver.current_url
          data[:details] = parse_details
        end
      end.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue
      binding.pry
    end

    def parse_img(event)
      event.css("img").map do |event|
        event.attribute("src")
      end.find do |img|
        img =~ /http:\/\/www.bottomofthehill.com\/f\/[\d]+fs.jpg/
      end
    end

    def parse_details_link(event)
      event.css("a").map do |event|
        event.attribute("href")
      end.find do |url|
        url =~ /http:\/\/www.bottomofthehill.com\/[\d]+.html/
      end
    end

    def parse_details
      time = $driver.css(".time").map(&:text).join(" ")
      websites = $driver.css(".website").map(&:text).join("\n")
      genres = $driver.css(".genre").map(&:text).join("\n")
      [time, websites, genres].join("\n")
    end

    def parse_date(date_string)
      DateTime.parse(date_string)
    end
  end
end
