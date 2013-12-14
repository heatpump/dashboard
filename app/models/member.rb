#encoding: utf-8

class Member < ActiveRecord::Base

  has_many :service_accounts

end