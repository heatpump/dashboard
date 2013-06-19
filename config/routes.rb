Dashboard::Engine.routes.draw do
  get "production", :to => "production#index"
  get "workstyle", :to => "workstyle#index"
  get "management", :to => "management#index"
  get "flagship", :to => "flagship#index"
  
  get "api/workstyle", :to => "workstyle#data"
  
  root :to => 'dashboard#index'
end
