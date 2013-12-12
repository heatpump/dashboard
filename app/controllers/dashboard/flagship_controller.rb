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
      
      accounts = ServiceAccount.all

      result = []

      accounts.each do |account|

        result_contents = []

        account.service_contents.each do |content|

          result_counts = []

          content.service_counts.each do |count|
            result_count = {
              date: count.measure_time.to_i,
              total_count: count.total_count,
              day_count: count.day_count
            }

            result_counts.push(result_count)
          end

          result_content = {
            id: content.id,
            title: content.title,
            content_url: content.content_url,
            thumbnail_small: content.thumbnail_small,
            thumbnail_medium: content.thumbnail_medium,
            counts: result_counts
          }
          result_contents.push(result_content)

        end

        result_account = {
          id: account.id,
          account: account.account,
          member_id: account.member_id,
          service_id: account.service_id,
          contents: result_contents
        }
        result.push(result_account);

      end

      
      render :json => result
    end

  end
end
