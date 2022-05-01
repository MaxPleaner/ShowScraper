require "sinatra/activerecord"

class DatabaseApp < Sinatra::Base
  register Sinatra::ActiveRecordExtension
  database = ENV["TEST"] == "true" ? "ShowScraperTest" : "ShowScraper"
  set :database, {adapter: "postgresql", database: database}
  # or set :database_file, "path/to/database.yml"
end

class Venue < ActiveRecord::Base
  has_many :events
end

class Event < ActiveRecord::Base
  belongs_to :venue
end


