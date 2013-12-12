require_dependency "dashboard/application_controller"

module Dashboard
  class FlagshipController < ApplicationController
    def index
    end

    def data
      split = params[:split]
      group = params[:group]
      date_since = Date.parse('2013-03-25')
      date_until = Date.parse('2014-03-31')
      
      result = ServiceAccount.all
      
      render :json => result
    end

  end
end
