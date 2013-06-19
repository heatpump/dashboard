require 'test_helper'

module Dashboard
  class ManagementControllerTest < ActionController::TestCase
    test "should get index" do
      get :index
      assert_response :success
    end
  
  end
end
