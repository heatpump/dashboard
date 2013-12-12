#encoding: utf-8

class ServiceAccount < ActiveRecord::Base

	has_many :service_contents
end
