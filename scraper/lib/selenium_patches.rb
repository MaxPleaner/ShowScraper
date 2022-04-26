def $driver.css(selector)
	find_elements(:css, selector)
end

class Selenium::WebDriver::Element
	def css(selector)
		find_elements(:css, selector)
	end
end