#encoding: utf-8

class ServiceContent < ActiveRecord::Base

  belongs_to :service_account
  belongs_to :members
  has_many :service_counts

  validates :content_url,
    :uniqueness => true

  def last_count
    self.service_counts.order('measure_time DESC').first
  end

  def calc_counts(ranges)
  	result = []
  	ranges.each do |range|
  		count = self.service_counts.where(measure_time: range).sum(:day_count)
  		result << {
  			from: range.first,
  			until: range.last,
  			count: count
  		}
  	end
  	return result
  end  

end
