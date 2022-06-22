class AugustHall
  MAIN_URL = "https://www.augusthallsf.com/calendar/"

  cattr_accessor :events_limit
  self.events_limit = 200

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    events = []
    $driver.get(MAIN_URL)

    # remove annoying hidden cookie bar
    $driver.execute_script <<-TXT
      var cookieBar = document.querySelector("#cookie-law-info-bar");
      cookieBar && cookieBar.remove();
    TXT

    loop do |i|
      get_events.each do |event|
        next if events.count >= events_limit
        events.push(parse_event_data(event, &foreach_event_blk))
      end
      break if events.count >= events_limit
      got_next_page = get_next_page
      break unless got_next_page
    end
    events
  end

  class << self
    private

    def get_events
      $driver.css(".tw-section")
    end

    def get_next_page
      $driver.execute_script <<-JS
        var cookieBar = document.querySelector('#cookie-law-info-bar');
        if (cookieBar) { cookieBar.remove() };
      JS
      link = $driver.css(".next a")[0]
      return false unless link
      link.click
      true
    end

    def parse_event_data(event, &foreach_event_blk)
      {
        url: event.css(".tw-name a")[0].attribute("href"),
        img: parse_img(event),
        date: DateTime.parse(event.css(".tw-event-date")[0].text),
        title: event.css(".tw-name")[0].text,
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end

    def parse_img(event)
      event.css(".background-wrapper")[0].attribute("style").scan(/url\(\"(.+)\"\)/)[0][0]
    end
  end
end
