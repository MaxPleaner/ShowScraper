class UCBerkeleyTheater
  MAIN_URL = "https://theuctheatre.org/events"

  cattr_accessor :events_limit, :load_time
  self.events_limit = 200
  self.load_time = 2

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    get_events.each.with_index.map do |event, index|
      next if index >= events_limit
      parse_event_data(event, &foreach_event_blk)
    end.compact
  end

  class << self
    private

    def get_events
      $driver.navigate.to(MAIN_URL)
      $driver.css(".shows-collection-item")
    end

    def parse_event_data(event, &foreach_event_blk)
      date = parse_date(event) rescue return
      {
        date: date,
        url: event.css("a[href^='/shows/']")[0].attribute("href"),
        title: parse_title(event),
        img: parse_image(event),
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def parse_date(event)
      date_div = event.css(".date-div")[0]
      month = date_div.css(".heading-2")[0].text.strip
      day = date_div.css(".heading-3")[0].text.strip
      DateTime.parse("#{month} #{day}")
    end

    def parse_title(event)
      main_title = event.css(".name-listing")[0].text.strip
      support = event.css(".support-listing")[0]&.text&.strip
      support ? "#{main_title}, #{support}" : main_title
    end

    def parse_image(event)
      img_div = event.css(".shows-image")[0]
      style = img_div.attribute("style")
      style.match(/url\("([^"]+)"\)/)[1]
    rescue
      nil
    end
  end
end
