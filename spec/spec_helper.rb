require 'database_cleaner'

ENV["TEST"] = "true"
ENV["PRINT_FULL_DETAIL"] = "false"
ENV["RESCUE_SCRAPING_ERRORS"] = "false"

RSpec.configure do |config|
  config.expect_with :rspec do |expectations|
    expectations.include_chain_clauses_in_custom_matcher_descriptions = true
  end

  config.mock_with :rspec do |mocks|
    mocks.verify_partial_doubles = true
  end

  config.shared_context_metadata_behavior = :apply_to_host_groups

  config.filter_run_when_matching :focus

  config.before(:suite) do
    unless ENV["NO_DB"] == "true"
      DatabaseCleaner.clean_with(:truncation)
      require "#{__dir__}/../db/seeds.rb"
    end
  end
end
