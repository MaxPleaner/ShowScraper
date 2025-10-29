require 'sinatra'
require 'json'
require "#{__dir__}/../db/db.rb"

class Server < Sinatra::Base
  get '/venues' do
    Venue.all.to_json
  end
  get '/events' do
    # TODO: limit to stuff that is newer than present day
    Event.all.to_json
  end
end


# endpoint 1: /venues
# endpoint 2: /events

# view 1: list
# > filter by day
# > filter by venue

# view 2: map
# > filter by day
