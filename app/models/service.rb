#encoding: utf-8

class Service < ActiveRecord::Base

  has_many :service_accounts

end