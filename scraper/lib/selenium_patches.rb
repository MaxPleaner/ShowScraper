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
			# set up new tab
			execute_script("window.open()")
			switch_to.window(window_handles.last)
			get(url)

			# execute block
			blk_result = blk.call

			# close new tab
			close
			switch_to.window(window_handles.last)

			# return block result
			blk_result
		end
	end
end
