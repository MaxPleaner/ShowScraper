class Regency
  # No pagination needed here, all events shown at once.
  MAIN_URL = "https://www.theregencyballroom.com/shows/"

  cattr_accessor :events_limit
  self.events_limit = 200

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    events = []
    get_events.each do |event|
      next if events.count >= events_limit
      result = parse_event_data(event, &foreach_event_blk)
      next unless result
      events.push result
    end
    events
  end

  class << self
    private

    def get_events
      $driver.navigate.to(MAIN_URL)
      sleep 2
      $driver.css(".c-axs-event-card__wrapper").reject { |node| node['class'].include?('mobile') }
    end

    def parse_event_data(event, &foreach_event_blk)
      date = event.css(".date")[0]&.text || return
      return if date.blank?
      {
        date: DateTime.parse(date),
        url: (event.css(".c-axs-event-card__header")[0] || event.css(".c-axs-event-card__image a")[0]).attribute("href"),
        img: (event.css(".mediaImage")[0] || event.css(".u-img-respond")[0]).attribute("src"),
        title: event.css(".c-axs-event-card__title")[0].text,
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end
  end
end
