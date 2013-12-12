Dashboard::Engine.routes.draw do
  get "production", :to => "production#index"
  get "workstyle", :to => "workstyle#index"
  get "management", :to => "management#index"
  get "flagship", :to => "flagship#index"
  
  get "api/workstyle/by_month", :to => "workstyle#data_by_month"
  get "api/workstyle/by_person", :to => "workstyle#data_by_person"

  get "api/production", :to => "production#data"
  
  get "api/flagship", :to => "flagship#data"
  
  root :to => 'dashboard#index'
end
