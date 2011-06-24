require 'rubygems'
require 'bundler'
require 'bundler/setup'
require 'fileutils'
Bundler.require(:default, :development, :production)


class JsusDemo < Sinatra::Base
  set :root, File.expand_path("..", __FILE__)
  Jsus::Middleware.settings = {
    :cache         => environment == :production,
    :cache_path    => "#{root}/public/javascripts/jsus/require",
    :packages_dir  => "#{root}/vendor/js",
    :cache_pool    => environment == :production,
    :includes_root => "#{root}/vendor/js"
  }

  use Jsus::Middleware

  get '/' do
    haml :index
  end

  get '/style.css' do
    sass :style
  end
end
