class BandcampOakland
  MAIN_URL = "https://linktr.ee/bandcampoakland"

  cattr_accessor :events_limit, :load_time
  self.events_limit = 200
  self.load_time = 3

  def self.run(events_limit: self.events_limit, &foreach_event_blk)
    $driver.get(MAIN_URL)
    get_events.map.with_index do |event, index|
      next if index >= events_limit
      parse_event_data(event, &foreach_event_blk)
    end.compact
  end

  class << self
    private

    def get_events
      $driver.css("[data-testid='StyledContainer']")
    end

    def parse_event_data(event, &foreach_event_blk)
      text = event.text
      {
        date: Date.strptime(text.match(/\((.*?)\)/)[1], "%m/%d"),
        img: nil,
        title: text.match(/\) (.*)/)[1],
        # url: event.css(".detail_seetickets_image a")[0].attribute("href"),
        url: event.css("a")[0].attribute("href"),
        details: ""
      }.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    rescue => e
      ENV["DEBUGGER"] == "true" ? binding.pry : raise
    end
  end
end
