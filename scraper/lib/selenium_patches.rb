class Selenium::WebDriver::Element
	def css(selector)
		find_elements(:css, selector)
	end
end

class SeleniumPatches
	def self.patch_driver(driver)
		def driver.css(selector)
			find_elements(:css, selector)
		end

		def driver.new_tab(url, &blk)
			execute_script("window.open()")
			switch_to.window(window_handles.last)
			get(url)
			blk.call
			close
			switch_to.window(window_handles.last)
		end
	end
end
