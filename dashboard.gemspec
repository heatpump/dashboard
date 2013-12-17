$:.push File.expand_path("../lib", __FILE__)

# Maintain your gem's version:
require "dashboard/version"

# Describe your gem and declare its dependencies:
Gem::Specification.new do |s|
  s.name        = "dashboard"
  s.version     = Dashboard::VERSION
  s.authors     = ["Jun Komatsu"]
  s.email       = ["jun@uniba.jp"]
  s.homepage    = "http://uniba.jp"
  s.summary     = "dashboard for radiografija"
  s.description = "KPI Visualization for radiografija"

  s.files = Dir["{app,config,db,lib}/**/*"] + ["MIT-LICENSE", "Rakefile", "README.rdoc"]
  s.test_files = Dir["test/**/*"]

  s.add_dependency "rails", "~> 3.2.13"
  s.add_dependency "momentjs-rails"
  s.add_dependency "bootstrap-rails-engine"
  s.add_dependency "bootstrap-daterangepicker-rails"

  s.add_development_dependency "sqlite3"
end
