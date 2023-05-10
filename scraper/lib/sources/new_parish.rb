class NewParish

  # This one is scraped with Nokigiri, because it doesn't seem to like headless
  # scrapers.

  # It does include a JSON representation of the show list in its HTML though!

  cattr_accessor :events_limit
  self.events_limit = 200

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    events = []
    i = 1
    page = get_next_page(i)
    loop do
      get_events(page).each do |event|
        next if events.count >= events_limit
        events.push(parse_event_data(event, &foreach_event_blk))
      end
      break if events.count >= events_limit
      got_next_page = get_next_page(i + 1)
      break unless got_next_page
      i += 1
    end
    events
  end

  class << self
    private

    def get_events(page)
      JSON.parse page.at('script[type="application/ld+json"]').text
    end

    def get_next_page(idx)
      Nokogiri.parse URI.open("https://www.ticketweb.com/venue/the-new-parish-oakland-ca/428995?page=#{idx}").read
    end

    def parse_event_data(event, &foreach_event_blk)
      {
        url: event["url"],
        img: event["image"],
        date: DateTime.parse(event["startDate"]),
        title: event["name"],
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end
  end
end
