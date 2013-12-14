#encoding: utf-8

class ServiceAccount < ActiveRecord::Base
  belongs_to :member
  belongs_to :service
  has_many :service_contents

end
