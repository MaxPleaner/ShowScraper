class Knockout
	# "Load more" type site

  cattr_accessor :pages_limit, :events_limit
  self.pages_limit = 5
  self.events_limit = 200

	def self.run(events_limit: self.events_limit, &foreach_event_blk)
		index = 0
		events = []
		loop do
			added = []
			days = get_days(index)
			days.each do |day_container|
				new_events = day_container.css(".item-link")
				added.concat(new_events)
				new_events.each do |event|
	        		next if events.count >= events_limit
					events.push(parse_event_data(day_container, event, &foreach_event_blk))
				end
			end
			break if events.count >= events_limit
			break if added.empty? || index > pages_limit
			index += 1
		end
		events
	end

	class << self
		private
		def get_days(page_idx)
			$driver.navigate.to("https://theknockoutsf.com/calendar2")
			page_idx.times do
				sleep 1
				$driver.css("a[aria-label='Go to next month']")[0].click
				sleep 1
			end
			$driver.css("td[role='gridcell']")
		end

		# "event" here is actually a day which can contain multiple events
		def parse_event_data(day_container, event, &foreach_event_blk)
			month, year = $driver.css("div[aria-role='heading']")[0].text.split(" ")
			day = day_container.css(".marker-daynum")[0].text

			# There are two kinds of events
			title = event.css(".item-title")[0]&.text
			url = event.attribute("href")
			img = nil
			$driver.new_tab(url) do
				img = $driver.css("link[rel='icon']")[0].attribute("href")
			end

			{
				date: DateTime.parse("#{month} #{day}, #{year}"),
				url: url,
				title: title,
				img: img,
				details: "",
			}.
				tap { |data| Utils.print_event_preview(self, data) }.
				tap { |data| foreach_event_blk&.call(data) }
		rescue => e
			ENV["DEBUGGER"] == "true" ? binding.pry : raise
		end
	end
end
