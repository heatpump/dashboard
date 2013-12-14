#encoding: utf-8

class ServiceAccount < ActiveRecord::Base
  belongs_to :member
  belongs_to :service
  has_many :service_contents

  def calc_counts(ranges)

  	contents = service_contents

  	result = []
  	ranges.each do |range|
  		count = ServiceCount.where(measure_time: range).where(service_content_id: contents).sum(:day_count)
  		result << {
  			from: range.first,
  			until: range.last,
  			count: count
  		}
  	end
  	return result
  end  

end
