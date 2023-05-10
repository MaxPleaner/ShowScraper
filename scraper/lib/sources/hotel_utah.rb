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
      $driver.css(".seetickets-list-event-container")
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
        url: event.css("a")[0].attribute("href"),
        img: event.css(".seetickets-list-view-event-image-container img")[0]&.attribute("src") || "",
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
      event.css(".event-title")[0].text
    end

    def parse_date(event)
      date_str = event.css(".event-date")[0].text
      DateTime.parse(date_str)
    end
  end
end

