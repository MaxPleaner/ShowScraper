# NOTE:
# I originally wrote the scraper to use DNA Lounge's calendar view, but the redirect stopped working.
# So I've updated it to use the RSS feed instead, which is more bot-friendly.

require 'open-uri'
require 'rss'
require 'nokogiri'

class DnaLounge
  MAIN_URL = "https://www.dnalounge.com/calendar/dnalounge.rss"

  cattr_accessor :events_limit
  self.events_limit = 200

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    events = []
    get_events.each do |event|
      next if events.count >= events_limit
      result = parse_event_data(event, &foreach_event_blk)
      next unless result
      events.push(result)
    end
    events
  end

  class << self
    private

    def get_events
      rss_content = URI.open(MAIN_URL).read
      rss = RSS::Parser.parse(rss_content, false)
      rss.items
    end

    def parse_event_data(event, &foreach_event_blk)
      doc = Nokogiri::HTML(event.content_encoded)
      {
        url: doc.at("a.url")["href"],
        img: doc.at('div.event_flyer a[href] img')&.to_h&.fetch("src") || "https://cdn.dnalounge.com/logo2025.gif",
        date: DateTime.parse(doc.at('abbr.dtstart')['title']),
        title: doc.at('abbr.summary')&.to_h&.fetch("title") || doc.at('div.summary a').text.strip,
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end
  end
end


class DnaLounge_OLD
  MAIN_URL = "https://www.dnalounge.com/calendar/latest.html" # this performs an internal redirect

  cattr_accessor :months_limit, :events_limit
  self.months_limit = 3
  self.events_limit = 200

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    events = []
    $driver.get(MAIN_URL)
    months_limit.times do |i|
      get_events.each do |event|
        next if events.count >= events_limit
        result = parse_event_data(event, &foreach_event_blk)
        next unless result
        events.push(result)
      end
      break if events.count >= events_limit
      get_next_page unless i == months_limit - 1
    end
    events
  end

  class << self
    private

    def get_events
      $driver.css(".calrow a")
    end

    def get_next_page
      $driver.css(".navR")[0].click
    end

    def parse_event_data(event, &foreach_event_blk)
      date = parse_date(event)
      return if date < Date.today
      $driver.new_tab(event.attribute("href")) do
        {
          url: $driver.current_url,
          img: parse_img(event),
          date: date,
          title: parse_title(event),
          details: ""
        }
      end.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def parse_date(event)
      link = event.attribute("href")
      regex = /https:\/\/www.dnalounge.com\/calendar\/(\d+)\/(\d+)-(\d+)/
      year, month, day = link.scan(regex)[0]
      DateTime.parse("#{day}/#{month}/#{year}")
    end

    def parse_img(event)
      host = "http://" + URI.parse($driver.current_url).host
      thumb = $driver.css(".fthumb")[0]
      return "" unless thumb
      path = thumb.attribute("srcset").split(" ")[2]
      host + path
    end

    def parse_title(event)
      title = $driver.css(".event_title")[0].text
      title.blank? ? $driver.title : title
    end
  end
end
