class Knockout
	# "Load more" type site

  cattr_accessor :pages_limit, :events_limit
  self.pages_limit = 5
  self.events_limit = 200

	def self.run(events_limit: self.events_limit, &foreach_event_blk)
		index = 1
		events = []
		loop do
			new_events = get_events(index)
			new_events.each do |event|
        next if events.count >= events_limit
				events.push(parse_event_data(event, &foreach_event_blk))
			end
			break if events.count >= events_limit
			break if new_events.empty? || index > pages_limit
			index += 1
		end
		events
	end

	class << self
		private
		def get_events(page_idx)
			$driver.navigate.to("https://theknockoutsf.com/events/list/?tribe_paged=#{page_idx}")
			$driver.css(".type-tribe_events")
		end

		def parse_event_data(event, &foreach_event_blk)
			{
				date: parse_date(event.css(".tribe-event-date-start")[0].text),
				url: event.css(".tribe-event-url")[0].attribute("href"),
				title: event.css(".tribe-event-url")[0].text,
				details: "",
			}.tap do |data|
				data[:img] = fetch_full_res_image(data)
			end.
				tap { |data| Utils.print_event_preview(self, data) }.
				tap { |data| foreach_event_blk&.call(data) }
		rescue => e
			ENV["DEBUGGER"] == "true" ? binding.pry : raise
		end

		def fetch_full_res_image(event)
			$driver.new_tab(event[:url]) do
				$driver.css(".tribe-events-event-image img")[0].attribute("src")
			end
		end

		def parse_date(date_string)
			DateTime.parse(date_string)
		end
	end
end
