class Knockout
	PAGE_LIMIT = 20

	def self.run
		index = 1
		events = []
		loop do
			events.concat(
				get_events(index).map { |event| parse_event_data(event) }
			)
			break if events.empty? || index > PAGE_LIMIT
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
