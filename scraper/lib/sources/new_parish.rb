class NewParish
  MAIN_URL = "https://www.ticketweb.com/venue/the-new-parish-oakland-ca/428995"

  cattr_accessor :events_limit
  self.events_limit = 200

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    events = []
    i = 1
    $driver.get(MAIN_URL)
    loop do
      get_events.each do |event|
        next if events.count >= events_limit
        events.push(parse_event_data(event, &foreach_event_blk))
      end
      break if events.count >= events_limit
      got_next_page = get_next_page(i + 1)
      break unless got_next_page
      i += 1
    end
    events
  end

  class << self
    private

    def get_events
      $driver.css(".media.theme-mod")
    end

    def get_next_page(idx)
      btn = $driver.css(".pagination-nav a").find do |btn|
        btn.attribute("data-ng-click")&.include?(idx.to_s)
      end
      return unless btn
      btn&.click
      true
    end

    def parse_event_data(event, &foreach_event_blk)
      {
        url: event.css(".event-name a")[0].attribute("href"),
        img: event.css("img")[0].attribute("src"),
        date: parse_date(event),
        title: event.css(".event-name")[0].text,
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def parse_img(event)
      event.css(".background-wrapper")[0].attribute("style").scan(/url\(\"(.+)\"\)/)[0][0]
    end

    def parse_date(event)
      str = [1, 0].map do |idx|
        event.css(".event-date")[idx].text.split(" ").first(3).join(" ")
      end.reject(&:blank?).first
      DateTime.parse(str)
    end
  end
end
