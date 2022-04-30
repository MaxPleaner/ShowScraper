require "sinatra/activerecord"

class DatabaseApp < Sinatra::Base
  register Sinatra::ActiveRecordExtension
  set :database, {adapter: "postgresql", database: "ShowScraper"}
end

class User < ActiveRecord::Base
end
# or set :database_file, "path/to/database.yml"

