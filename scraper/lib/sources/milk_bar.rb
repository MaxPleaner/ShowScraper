class MilkBar
  # Eventbrite, "load more" site
  MAIN_URL = "https://www.eventbrite.com/o/the-milk-bar-presents-6806338175"

  cattr_accessor :months_limit, :events_limit
  self.months_limit = 3
  self.events_limit = 200

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    events = []
    $driver.get(MAIN_URL)
    # 5.times { get_next_page }
    get_events.each do |event|
      next if events.count >= events_limit
      result = parse_event_data(event, &foreach_event_blk)
      events.push(result) if result.present?
    end
    events.uniq { |e| [e[:date].strftime("%m/%d/%Y"), e[:title]] }.sort_by { |e| e[:date] }
  end

  class << self
    private

    def get_events
      $driver.css(".eds-event-card-content")
    end

    def get_next_page
      btns = $driver.css(".organizer-profile__show-more button")
      return false unless btns.length > 1
      btns[0]&.click if btns[0].displayed?
      sleep 1
      true
    end

    def parse_event_data(event, &foreach_event_blk)
      title = event.css(".eds-event-card__formatted-name--is-clamped")[0].text
      date = parse_date(event) rescue return
      return if title.blank?
      {
        url: event.css(".eds-event-card-content__action-link")[0].attribute("href"),
        img: event.css(".eds-event-card-content__image")[0]&.attribute("data-src") || "",
        date: date,
        title: title,
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def parse_date(event)
      date_str = event.css(".eds-event-card-content__sub-title")[0].text
      if date_str.include?("Today")
        DateTime.now
      elsif date_str.include?("Tomorrow")
        DateTime.now + 1.day
      else
        date_str = date_str.split("+")[0]
        DateTime.parse(date_str)
      end
    end
  end
end
