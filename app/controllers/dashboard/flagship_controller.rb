require_dependency "dashboard/application_controller"

module Dashboard
  class FlagshipController < ApplicationController
    def index
    end

    def data
      group = params[:group] # member, account, content
      split = params[:split] # year, month, day
      date_since = params[:since] || '2013-04-01';
      date_until = params[:until] || '2014-03-31';
      date_since = Time.parse(date_since)
      date_until = Time.parse(date_until + ' 23:59:59')
      
      #
      # [
      #   {
      #     label: 'account name',
      #     member: 'rei@uniba.jp',
      #     account: 'animist',
      #     service: 'YouTube',
      #     count: [
      #       {
      #         time: 131111111, (unix time)
      #         value: 10,
      #       },
      #       {
      #       },
      #     ]
      #   },
      #   {
      #
      #   },
      # ...
      # ]
      #

      # by month
      ranges = build_ranges(date_since, date_until, split)

      result = []

      if group == 'contents'
        # by contents
        service_contents = ServiceContent.order(:service_account_id)

        service_contents.each do |service_content|
          counts = service_content.calc_counts(ranges)

          result << {
            label: service_content.title,
            account: service_content.service_account.account,
            service: service_content.service_account.service.name,
            counts: counts
          }
        end

      else
        # by contents
        service_accounts = ServiceAccount.order(:service_id)

        service_accounts.each do |service_account|
          counts = service_account.calc_counts(ranges)

          result << {
            label: service_account.account,
            account: service_account.account,
            service: service_account.service.name,
            counts: counts
          }
        end

      end

      render :json => result
    end

    private

    def build_ranges(range_beginning, range_end, split)

    	ranges = []
      current = range_beginning
      while current < range_end do

        if split == 'day'
          cur_end = current.end_of_day
          if range_end < cur_end
            cur_end = range_end
          end
          ranges.push(current .. cur_end)
          current = current.tomorrow.beginning_of_day

        elsif split == 'week'
          cur_end = current.end_of_week
          if range_end < cur_end
            cur_end = range_end
          end
          ranges.push(current .. cur_end)
          current = current.next_week.beginning_of_week

        elsif split == 'month'
          cur_end = current.end_of_month
          if range_end < cur_end
            cur_end = range_end
          end
          ranges.push(current .. cur_end)
          current = current.next_month.beginning_of_month

        elsif split == 'quarter'
          cur_end = current.end_of_quarter
          if range_end < cur_end
            cur_end = range_end
          end
          ranges.push(current .. cur_end)
          current = current.next_month.next_month.next_month.beginning_of_quarter

        elsif split == 'year'
          cur_end = current.end_of_year
          if range_end < cur_end
            cur_end = range_end
          end
          ranges.push(current .. cur_end)
          current = current.next_year.beginning_of_year

        end

      end

      return ranges
    end

  end
end
