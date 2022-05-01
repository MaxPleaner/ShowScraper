class DnaLounge
  MAIN_URL = "https://www.dnalounge.com/calendar/latest.html" # this performs an internal redirect
  MONTHS_LIMIT = 2

  def self.run(&foreach_event_blk)
    events = []
    $driver.get(MAIN_URL)
    MONTHS_LIMIT.times do |i|
      events.concat(
        get_events.map { |event| parse_event_data(event, &foreach_event_blk) }
      )
      get_next_page unless i == MONTHS_LIMIT - 1
    end
    events
  end

  class << self
    private

    def get_events
      $driver.css(".calrow a")
    end

    def get_next_page
      $driver.css(".navR")[0].click
    end

    def parse_event_data(event, &foreach_event_blk)
      $driver.new_tab(event.attribute("href")) do
        {
          url: $driver.current_url,
          img: parse_img(event),
          date: parse_date(event),
          title: $driver.css(".event_title")[0].text,
          details: parse_details(event)
        }
      end.
        tap { |data| pp(data) if ENV["PRINT_EVENTS"] == "true" }.
        tap { |data| foreach_event_blk.call(data) }
    end

    def parse_img(event)
      host = URI.parse($driver.current_url).host
      thumb = $driver.css(".fthumb")[0]
      return "" unless thumb
      path = thumb.attribute("srcset").split(" ")[2]
      host + path
    end

    def parse_date(event)
      date = $driver.css(".event_date")[0].text
      time = $driver.css(".time")[0].text.split(" ")[0]
      year = $driver.current_url.split("/")[2]
      date_string = "#{date}, #{year}, #{time}"
      DateTime.parse(date_string)
    end

    def parse_details(event)
      genre = $driver.css(".genre")[0]&.text || ""
      age = $driver.css(".age")[0].text
      price = $driver.css(".price")[0].text
      blurb = $driver.css(".event_blurb")[0].text

      [genre, age, price, blurb].reject(&:blank?).join("\n")
    end
  end
end
