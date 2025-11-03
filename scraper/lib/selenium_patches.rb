class Selenium::WebDriver::Element
	def css(selector)
		find_elements(:css, selector)
	end

	# Hidden text is not returned by `.text` by default.
	# (e.g. if the element is not visible)
	# This patch fixes that.
	def text(strip: false)
		txt = $driver.execute_script("return arguments[0].textContent;", self)
		return txt unless strip
		txt&.strip.tr("\t\n", " ")
	end

	def parent
		find_element(xpath: "..")
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
