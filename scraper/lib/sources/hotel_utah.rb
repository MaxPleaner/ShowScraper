class HotelUtah
  MAIN_URL = "https://hotelutah.com/#calendar"

  cattr_accessor :months_limit, :events_limit
  self.months_limit = 3
  self.events_limit = 200

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    events = []
    $driver.get(MAIN_URL)
    # months_limit.times do |i|
    get_events.each do |event|
      next if events.count >= events_limit
      result = parse_event_data(event, &foreach_event_blk)
      events.push(result) if result.present?
    end
    events
  end

  class << self
    private

    def get_events
      $driver.css(".list-view-item")
    end

    # def get_next_page
    #   btns = $driver.css(".organizer-profile__show-more button")
    #   return false unless btns.length > 1
    #   btns[0].click
    #   true
    # end

    def parse_event_data(event, &foreach_event_blk)
      title = parse_title(event)
      return if title.blank?
      {
        url: event.css(".list-img a")[0].attribute("href"),
        img: event.css(".list-img img")[0]&.attribute("src") || "",
        date: parse_date(event),
        title: title,
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def parse_title(event)
      artist1 = event.css(".event-name")[0].text
      artist2 = event.css(".detail_supporting_talent .name")[0]&.text
      [artist1, artist2].compact.join(", ")
    end

    def parse_date(event)
      date_str = event.css(".detail_event_date .name")[0].text
      date_str = date_str.split("+")[0]
      DateTime.parse(date_str)
    end
  end
end

