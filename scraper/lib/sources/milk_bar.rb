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
    sleep 5
    listings = get_events.select(&:displayed?)
    listings.each do |event|
      next if events.count >= events_limit
      result = parse_event_data(event, &foreach_event_blk)
      events.push(result) if result.present?
    end
    results = events.uniq { |e| [e[:date].strftime("%m/%d/%Y"), e[:title]] }.sort_by { |e| e[:date] }
    # binding.pry
    results
  end

  class << self
    private

    def get_events
      $driver.css(".event-card")
    end

    def get_next_page
      btns = $driver.css(".organizer-profile__show-more button")
      return false unless btns.length > 1
      btns[0]&.click if btns[0].displayed?
      sleep 1
      true
    end

    def parse_event_data(event, &foreach_event_blk)
      # binding.pry
      title = event.css(".event-card__clamp-line--two")[0].text
      date = parse_date(event) rescue nil
      return if title.blank?
      {
        url: event.css(".event-card-link")[0].attribute("href"),
        img: event.css(".event-card-image")[0]&.attribute("src") || "",
        date: date,
        title: title,
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    # The dates here are super annoying. Sometimes it's Monday, March 8 which can be easily parsed
    # Sometimes it's stuff like "Tuesday 8PM" which refers to the next occurring Tuesday.
    def parse_date(event)
      date_str = event.css(".event-card__clamp-line--one")[0].text
      if date_str.include?("Today")
        DateTime.now
      elsif date_str.include?("Tomorrow")
        DateTime.now + 1.day
      elsif date_str.include?(",") # e.g. Monday, March 8
        return DateTime.parse(date_str)
      else # e.g. "Tuesday 8PM"
        parse_next_weekday(date_str)
      end
    end

    def parse_next_weekday(str)
      # Map weekday names to their corresponding wday numbers (0-6, Sunday is 0)
      weekday_map = {
        "Sunday" => 0, "Monday" => 1, "Tuesday" => 2, "Wednesday" => 3,
        "Thursday" => 4, "Friday" => 5, "Saturday" => 6
      }
      
      # Get the current DateTime
      now = DateTime.now
      
      # Extract the target weekday's number and the specified time (hours and minutes)
      weekday_name = weekday_map.keys.find { |k| str.downcase.include?(k.downcase) }
      target_weekday = weekday_map[weekday_name]
      
      # Calculate the difference in days to the next occurrence of the target weekday
      days_difference = (target_weekday - now.wday) % 7
      days_difference = 7 if days_difference == 0 # If today is the target day, set to next week
      
      # Calculate the next occurrence of the target weekday and time
      next_occurrence = now + days_difference
      next_occurrence = DateTime.new(next_occurrence.year, next_occurrence.month, next_occurrence.day)
      
      next_occurrence
    end
    
  end
end
