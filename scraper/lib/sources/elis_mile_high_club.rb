class ElisMileHighClub

  # The calendar is shown at elismilehigh.com, but its through an iframe,
  # so we can rather just access the Google calendar directly
  MAIN_URL = "https://calendar.google.com/calendar/embed?src=5b4fnnnhfa7v3svqg76kj3914g%40group.calendar.google.com&ctz=America/Los_Angeles"

  cattr_accessor :months_limit, :events_limit, :load_time
  self.months_limit = 3
  self.events_limit = 200
  self.load_time = 2

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    events = []
    $driver.get(MAIN_URL)
    sleep load_time
    months_limit.times do |i|
      new_events = get_events
      new_events.each do |event|
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
      $driver.css(".rb-ni")
    end

    def get_next_page
      $driver.css("#navForward1")[0].click
    end

    def parse_event_data(event, &foreach_event_blk)
      event.click # shows a popup with event details

      {
        date: parse_date($driver.css(".event-when")[0].text),
        title: $driver.css(".details .title")[0].text,
        url: "",
        img: "",
        details: $driver.css(".event-description")[0].text
      }.tap do
        $driver.css(".bubble-closebutton")[1].click
      end.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    end

    def parse_date(date_string)
      DateTime.parse(date_string)
    end
  end
end
