class StorkClub
  # Awesome calendar which shows multiple months at once!
  MAIN_URL = "https://theestorkclub.com/calendar/"

  cattr_accessor :events_limit, :load_time
  self.events_limit = 200
  self.load_time = 3

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    $driver.get(MAIN_URL)
    get_events.map.with_index do |event, index|
      next if index >= events_limit
      parse_event_data(event, &foreach_event_blk)
    end.compact
  end

  class << self
    private

    def get_events
      # resize the window so we get the better-organized calendar view
      max_width, max_height = $driver.execute_script("return [window.screen.availWidth, window.screen.availHeight];")
      $driver.manage.window.resize_to(2000, max_height)

      $driver.css(".calendar-day-event")
    end

    def parse_event_data(event, &foreach_event_blk)
      puts "DATE: #{event.css(".dtstart")[0].text}"
      {
        date: DateTime.parse(event.css(".dtstart")[0].text.split(" ")[1].gsub(".", "/")),
        img: event.css(".detail_seetickets_image img")&.first&.attribute("src"),
        title: event.css(".event-title")[0].text,
        # url: event.css(".detail_seetickets_image a")[0].attribute("href"),
        url: event.css("#event_tickets")[0].attribute("href"),
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end
  end
end
