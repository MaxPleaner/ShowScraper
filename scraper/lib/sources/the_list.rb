class TheList

  cattr_accessor :events_limit
  self.events_limit = 200

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    events = []
    page_idx = 0
    get_next_page(page_idx)

    loop do |i|
      get_sections.each do |date, section_events|
        section_events.each do |event|
          break if events.count >= events_limit
          event = parse_event_data(date, event, &foreach_event_blk)
          events.push(event) if event
        end
      end
      break if events.count >= events_limit
      got_next_page = get_next_page(page_idx += 1)
      break unless got_next_page
    end
    events
  end

  class << self
    private

    def get_sections
      sections = $driver.css("body>ul>li")
      sections.map do |section|
        date = section.css("a")[0].text
        events = section.css("li")
        [date, events]
      end
    end

    def get_next_page(page_idx)
      url = "http://www.foopee.com/punk/the-list/by-date.#{page_idx}.html"
      $driver.get(url)
      !$driver.css("body")[0].text.start_with?("404 Not Found")
    end

    def parse_event_data(date, event, &foreach_event_blk)
      venue = event.css("b")[0].text
      return if venue_already_has_scraper?(venue)
      artists = (event.css("a").map(&:text) - [venue]).join(", ")
      title = "#{venue.upcase} - #{artists}"
      {
        url: "http://www.foopee.com/punk/the-list/",
        img: "",
        date: DateTime.parse(date),
        title: title,
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def venue_already_has_scraper?(venue)
      known_venue_names = [
        "DNA Lounge",
        "Elbo Room",
        "Eli's Mile High Club",
        "Golden Bull",
        "Knockout",
        "Thee Parkside",
        "Bottom of the Hill",
        "Cornerstone",
        "El Rio",
        "Freight",
        "Zeitgeist",
        "Grey Area",
        "Chapel",
        "Independent",
        "Starline",
        "Warfield",
        "Great American Music Hall",
        "Fillmore",
        "Greek Theater",
        "Ivy Room",
        "UC Theater",
        "Rickshaw Stop",
        "Make Out Room",
        "Yoshi's",
        "Winter's",
        "Regency Ballroom",
        "Utah",
        "Amado",
        "Bimbo",
        "Brick and Mortar",
        "Cafe Du Nord",
        "Crybaby",
        # "Eagle",
        "Midway",
        "Milk",
        "August Hall",
        "Masonic",
        "Paramount",
        "Fox Theater",
        "Great Northern",
        "New Parish",
      ].map do |known_venue|
        known_venue.downcase.gsub(/[^0-9a-z ]/i, '')
      end

      venue_stripped = venue.downcase.gsub(/[^0-9a-z ]/i, '')

      known_venue_names.any? do |known_venue_name|
        venue_stripped.include?(known_venue_name)
      end
    end
  end
end
