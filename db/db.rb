require "sinatra/activerecord"

class DatabaseApp < Sinatra::Base
  register Sinatra::ActiveRecordExtension
  set :database, {adapter: "postgresql", database: "ShowScraper"}
  # or set :database_file, "path/to/database.yml"
end

class Venue < ActiveRecord::Base
  has_many :events
end

class Event < ActiveRecord::Base
  belongs_to :venue
end


