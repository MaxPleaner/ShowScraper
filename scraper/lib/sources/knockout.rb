class Knockout
	def self.run
		index = 1
		events = []
		loop do
			get_events(index).each { |event| process_event(event) }
			break if events.empty? || index > 100
			index += 1
		end
	end

	class << self
		private
		def get_events(page_idx)
			$driver.navigate.to("https://theknockoutsf.com/events/list/?tribe_paged=#{page_idx}")
			$driver.css(".type-tribe_events")
		end

		def process_event(event)
			data = parse_event_data(event)
			pp data
		end

		def parse_event_data(event)
			{
				img: event.css("img")[0].attribute("src"),
				date: parse_date(event.css(".tribe-event-date-start")[0].text),
				url: event.css(".tribe-event-url")[0].attribute("href"),
				title: event.css(".tribe-event-url")[0].text,
			}
		end

		def parse_date(date_string)
			DateTime.parse(date_string)
		end
	end
end