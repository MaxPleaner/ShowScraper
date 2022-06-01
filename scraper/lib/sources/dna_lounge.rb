class DnaLounge
  MAIN_URL = "https://www.dnalounge.com/calendar/latest.html" # this performs an internal redirect

  cattr_accessor :months_limit, :events_limit
  self.months_limit = 3
  self.events_limit = 200

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    events = []
    $driver.get(MAIN_URL)
    months_limit.times do |i|
      get_events.each do |event|
        next if events.count >= events_limit
        events.push(parse_event_data(event, &foreach_event_blk))
      end
      break if events.count >= events_limit
      get_next_page unless i == months_limit - 1
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
          title: parse_title(event),
          details: parse_details(event)
        }
      end.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def parse_img(event)
      host = "http://" + URI.parse($driver.current_url).host
      thumb = $driver.css(".fthumb")[0]
      return "" unless thumb
      path = thumb.attribute("srcset").split(" ")[2]
      host + path
    end

    def parse_title(event)
      title = $driver.css(".event_title")[0].text
      title.blank? ? $driver.title : title
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
