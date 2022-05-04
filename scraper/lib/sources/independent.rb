class Independent

  MAIN_URL = "https://theindependentsf.com/calendar/"

  cattr_accessor :months_limit, :events_limit, :load_time
  self.months_limit = 3
  self.events_limit = 200
  self.load_time = 1

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
      $driver.execute_script <<-JS
        // Fucking Popups DIE YOU FUCK!
        document.querySelector(".email-popup-container").remove()
      JS
      $driver.css("a.fc-daygrid-event")
    end

    def get_next_page
      $driver.css(".fc-next-button")[0].click
      sleep load_time
    end

    def parse_event_data(event, &foreach_event_blk)
      event.click # shows a popup with event details
      link = $driver.css(".fancybox-slide--current .tw-info-price-buy-tix a")[-1].attribute("href")
      $driver.new_tab(link) do
        $driver.execute_script <<-JS
          // Fucking Popups DIE YOU FUCK!
          document.querySelector(".email-popup-container").remove()
        JS
        {
          date: parse_date($driver.css(".tw-event-date")[0].text),
          title: $driver.css(".tw-name").map(&:text).uniq.join(", "),
          url: $driver.current_url,
          img: $driver.css(".tw-image img")[0].attribute("src"),
          details: $driver.css(".tw-description")[0]&.text || ""
        }
      end.tap do |data|
        $driver.css("button[title='Close']")[1].click
      end.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    end

    def parse_date(date_string)
      # TODO: no year
      DateTime.parse(date_string)
    end
  end
end
