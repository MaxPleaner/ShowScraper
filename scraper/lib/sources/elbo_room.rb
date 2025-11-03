class ElboRoom
  # No pagination needed here, all events shown at once.
  MAIN_URL = "https://www.elboroomjacklondon.com/full-events-listing"

  # RIP elbo room
  DISABLED = true

  cattr_accessor :events_limit
  self.events_limit = 200

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    events = []
    get_events.each do |event|
      next if events.count >= events_limit
      result = parse_event_data(event, &foreach_event_blk)
      next unless result
      events.push(result)
    end.compact
  end

  class << self
    private

    def get_all_pages
      4.times do
        sleep 2
        load_more = $driver.css("[data-hook='load-more-button']")[0]
        return unless load_more
        load_more.click rescue next
      end
    end

    def get_events
      $driver.navigate.to(MAIN_URL)
      get_all_pages
      $driver.css("[data-hook='events-card']")
    end

    def parse_event_data(event, &foreach_event_blk)
      date = event.css("[data-hook='short-date']")[0].text
      return if date.blank?
      {
        date: DateTime.parse(date),
        url: event.css("[data-hook='ev-rsvp-button']")[0].attribute("href"),
        title: event.css("[data-hook='title']")[0].text,
        img: event.css("[data-hook='image']")[0].attribute("src"),
        details: "",
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def parse_date(date_string)
      # TODO: figure out how to handle year since this date string doesnt include it
      DateTime.parse(date_string)
    end
  end
end
