require 'sinatra'
require 'json'
require "#{__dir__}/../db/db.rb"

class Server < Sinatra::Base
  get '/venues' do
    Venue.all.to_json
  end
  get '/events' do
    Event.all.to_json
  end
end
