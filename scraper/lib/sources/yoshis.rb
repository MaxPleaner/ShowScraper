class Yoshis
  # Fairly shitty calendar. There is no way to join the dates up with the event info
  # (e.g. calendar metadata and event data are stored in separate lists in the DOM
  # and only look like they're related via positioning).
  #
  # Furthermore, the event details page combines multiple events into one
  # (e.g. a string of dates for a single artist) which makes thing difficult.
  #
  # However if the window is resized to mobile-view, the CSS is more semantic
  # and we can parse minimal info (e.g. no details) from the calendar view directly.
  MAIN_URL = "https://yoshis.com/events/calendar"

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
      # resize the window so we get the better-organized mobile view
      max_width, max_height = $driver.execute_script("return [window.screen.availWidth, window.screen.availHeight];")
      $driver.manage.window.resize_to(500, max_height)

      # scroll down so all the data is loaded
      $driver.execute_script("window.scrollBy(0,document.body.scrollHeight)")

      # close pesky popup
      $driver.css(".fancybox-button--close")[0]&.click
      sleep 1

      $driver.css(".event-indv")
    end

    def get_next_page
      $driver.css(".fc-button-next")[0].click
    end

    def parse_event_data(event, &foreach_event_blk)
      {
        url: event.css(".eimage a")[0].attribute("href"),
        img: event.css(".eimage img")[0].attribute("src"),
        date: DateTime.parse(event.css(".edate")[0].text),
        title: parse_title(event),
        details: ""
      }.
      tap { |data| Utils.print_event_preview(self, data) }.
      tap { |data| foreach_event_blk&.call(data) }
    end

    def parse_title(event)
      title = event.css(".etitle")[0].text
      parts = title.split("\n")
      [parts[1], parts[0]].compact.join(" - ")
    end
  end
end
