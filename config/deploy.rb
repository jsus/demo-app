require 'bundler/capistrano'

$:.unshift(File.expand_path('./lib', ENV['rvm_path'])) # Add RVM's lib directory to the load path.
require "rvm/capistrano"                  # Load RVM's capistrano plugin.

set :rvm_ruby_string, '1.9.2@yoba'        # Or whatever env you want it to run in.
set :application, "yoba"
set :repository,  "git://github.com/jsus/demo-app.git"
set :user,        "mark"
set :deploy_via, :remote_cache
set :deploy_to,   "/home/#{user}/demo-app"
set :scm,         :git
set :git_enable_submodules, 1
set :use_sudo,    false
set :keep_releases, 2
ssh_options[:keys] = "/Users/mark/.ssh/mark_xentronium_me"

role :web, "xentronium.me"
role :app, "xentronium.me"
role :db,  "xentronium.me", :primary => true,  :no_release => true

namespace :deploy do
  task :start do
    run "cd #{current_release} && bundle exec thin start -e production -S #{shared_path}/server.socket -d -P tmp/pids/thin.1.pid"
  end
  task :stop do
    run "cd #{current_release} && bundle exec thin stop -P tmp/pids/thin.1.pid"
  end

  task :restart, :roles => :app, :except => { :no_release => true } do
    deploy.stop
    deploy.start
  end
end

after "deploy:symlink" do
  commands = <<-CMD
    ln -nfs #{shared_path}/sockets             #{release_path}/tmp/sockets
    ln -nfs #{shared_path}/pids                #{release_path}/tmp/pids
  CMD
  commands.lines.each do |cmd|
    run cmd
  end
end
