class IvyRoom
  MAIN_URL = "https://www.ivyroom.com/calendar?view=calendar"

  cattr_accessor :months_limit, :events_limit, :load_time
  self.months_limit = 3
  self.events_limit = 200
  self.load_time = 2

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
      sleep load_time
      $driver.css(".background-image-link")
    end

    def get_next_page
      $driver.css(".yui3-calendarnav-nextmonth")[0].click
    end

    def parse_event_data(event, &foreach_event_blk)
      $driver.new_tab(event.attribute("href")) do
        {
          url: $driver.current_url,
          img: $driver.css(".image-block img")[0].attribute("src"),
          date: parse_date,
          title: $driver.title.gsub("IVY ROOM - ", ""),
          details: ""
        }
      end.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    end

    def parse_date
      date_parts = $driver.current_url.split("/")[-1].chars.each_slice(2).map(&:join)
      date_str = "#{date_parts[1]}-#{date_parts[0]}-20#{date_parts[2]}"
      DateTime.parse(date_str)
    end
  end
end
