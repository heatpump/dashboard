require_dependency "dashboard/application_controller"

module Dashboard
  class ProductionController < ApplicationController
    def index
    end

    def data
      date_since = Date.parse('2013-03-25')
      date_until = Date.parse('2014-03-31')
      
      result = Project.where(:start_date => date_since .. date_until)
      
      render :json => result
    end
    

  end
end
