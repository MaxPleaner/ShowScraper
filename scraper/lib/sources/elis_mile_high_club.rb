class ElisMileHighClub

  # The calendar is shown at elismilehigh.com, but its through an iframe,
  # so we can rather just access the Google calendar directly
  MAIN_URL = "https://calendar.google.com/calendar/embed?src=5b4fnnnhfa7v3svqg76kj3914g%40group.calendar.google.com&ctz=America/Los_Angeles"

  MONTHS_LIMIT = 3

  def self.run
    events = []
    $driver.get(MAIN_URL)
    MONTHS_LIMIT.times do |i|
      events.concat(
        get_events.map { |event| parse_event_data(event) }
      )
      get_next_page unless i == MONTHS_LIMIT - 1
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

    def parse_event_data(event)
      event.click # shows a popup with event details

      {
        date: parse_date($driver.css(".event-when")[0].text),
        title: $driver.css(".details .title")[0].text,
        url: "",
        img: "",
        details: $driver.css(".event-description")[0].text
      }.tap do
        $driver.css(".bubble-closebutton")[1].click
      end.tap { |x| pp(x) if ENV["PRINT_EVENTS"] == "true" }
    end

    def parse_date(date_string)
      DateTime.parse(date_string)
    end
  end
end
