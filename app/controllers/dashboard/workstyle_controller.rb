require_dependency "dashboard/application_controller"
#require "heatpump-core/entry"

module Dashboard

  #include HeatpumpCore

  class WorkstyleController < ApplicationController
    def index
    end
    
    #
    # parameter
    #
    # until (iso date "YYYY/MM/DDTHH:MM:SSZ)
    # then
    #
    # group_by ("taggroup" | "tag")
    # users
    
    #
    def data_by_month
    
      date_since = params[:since].blank? ? Date.parse("2013-04-01") : Date.parse(params[:since])
      date_until = params[:until].blank? ? Date.today : Date.parse(params[:until])
      split = params[:split].blank? ? 'month' : params[:split]
      username = params[:username]
      
      arel = Entry.where(:date => date_since .. date_until)
      arel = arel.where(:username => username) unless username.blank?

      date_list = []
      result_template = {}

      case split
      when 'year'
        arel = arel.group(:year, :tag)
        key_since = date_since.prev_month.prev_month.prev_month.beginning_of_year.next_month.next_month.next_month
        key_until = date_until.prev_month.prev_month.prev_month.beginning_of_year.next_month.next_month.next_month

        key = key_since
        while key <= key_until do
          date_list.push key.strftime("%Y-%m-%d")
          result_template[key.strftime("%Y-%m-%d")] = 0
          key = key.next_year
        end

      when 'quarter'
        arel = arel.group(:term, :tag)
        key_since = date_since.beginning_of_quarter
        key_until = date_until.beginning_of_quarter

        key = key_since
        while key <= key_until do
          date_list.push key.strftime("%Y-%m-%d")
          result_template[key.strftime("%Y-%m-%d")] = 0
          key = key.next_month.next_month.next_month
        end

      when 'month'
        arel = arel.group(:year, :month, :tag)
        key_since = date_since.beginning_of_month
        key_until = date_until.beginning_of_month

        key = key_since
        while key <= key_until do
          date_list.push key.strftime("%Y-%m-%d")
          result_template[key.strftime("%Y-%m-%d")] = 0
          key = key.next_month
        end

      when 'week'
        arel = arel.group(:week_date, :tag)
        key_since = date_since.beginning_of_week
        key_until = date_until.beginning_of_week

        key = key_since
        while key <= key_until do
          date_list.push key.strftime("%Y-%m-%d")
          result_template[key.strftime("%Y-%m-%d")] = 0
          key = key.next_week
        end

      when 'day'
        arel = arel.group(:date, :tag)
        key_since = date_since.beginning_of_day
        key_until = date_until.beginning_of_day

        key = key_since
        while key <= key_until do
          date_list.push key.strftime("%Y-%m-%d")
          result_template[key.strftime("%Y-%m-%d")] = 0
          key = key.tomorrow
        end

      else
        arel = arel.group(:year, :month, :tag)
      end

      result = arel.sum(:hour)
      
      result_template['total'] = 0

      result_matrix = {}
      
      ['Pxxxx', 'Cxxxx', 'GROUP', 'INVESTMENT', 'PROFIT', 'MANAGEMENT', 'OTHER', 'UNKNOWN'].each do |category_tag|
        result_matrix[category_tag] = result_template.clone
      end

      # SQLの出力を二次元配列に変換する
      result.each do |row|

        case split
        when 'year'
          year = row[0][0]
          key = sprintf("\%04d-04-01", year.to_i)
          tag = row[0][1]
          hour = row[1]
        when 'quarter'
          key = row[0][0]
          /(\d{4})-(\d)Q/ =~ row[0][0]
          year = Regexp.last_match[1].to_i
          quarter = Regexp.last_match[2].to_i
          
          if (quarter == 4)
            year = year + 1
          end

          month = (quarter * 3 + 1) % 12
          key = sprintf("\%04d-\%02d-01", year, month)
          
          tag = row[0][1]
          hour = row[1]
        when 'month'
          year = row[0][0]
          month = row[0][1]
          key = sprintf("\%04d-\%02d-01", year.to_i, month.to_i)
          tag = row[0][2]
          hour = row[1]
        when 'week'
          key = row[0][0].strftime("%Y-%m-%d")
          tag = row[0][1]
          hour = row[1]
        when 'day'
          key = row[0][0].strftime("%Y-%m-%d")
          tag = row[0][1]
          hour = row[1]
        end

        next if tag.blank?
        
        
        if result_matrix[tag].nil?
          result_matrix[tag] = result_template.clone
        end
        result_matrix[tag][key] = hour
      end
      
      # 各タグ毎のtotalを計算する
      result_matrix.each do |tag, value|
        value.each do |key, hour|
          result_matrix[tag]['total'] += hour unless key == 'total'
        end
      end
      
      # Pxxxx, Cxxxx, GROUP の合計を計算する
      p_children = {}
      c_children = {}
      group_children = {}
      result_matrix.each do |tag, value|
      
        # Pxxxx
        if /P\d{4}/ =~ tag
          value.each do |key, hour|
            result_matrix['Pxxxx'][key] = (result_matrix['Pxxxx'][key] || 0) + hour # TODO: check
          end
          p_children[tag] = result_matrix.delete(tag)
        end

        # Cxxxx
        if /C\d{4}/ =~ tag
          value.each do |key, hour|
            result_matrix['Cxxxx'][key] = (result_matrix['Cxxxx'][key] || 0) + hour # TODO: check
          end
          c_children[tag] = result_matrix.delete(tag)
        end

        # GROUP
        if ['R', 'S', 'J', 'H', 'I', 'A', 'D', 'P', 'V', 'DSP'].index(tag)
          value.each do |key, hour|
            result_matrix['GROUP'][key] = (result_matrix['GROUP'][key] || 0) + hour # TODO: check
          end
          group_children[tag] = result_matrix.delete(tag)
        end

      end
      result_matrix['Pxxxx']['children'] = p_children
      result_matrix['Cxxxx']['children'] = c_children
      result_matrix['GROUP']['children'] = group_children
      
      # category毎の合計を計算する
      categories = {
        'INVESTMENT' => ['LAB', 'ME', 'GROUP', 'Cxxxx'],
        'PROFIT' => ['Pxxxx', 'CR'],
        'MANAGEMENT' => ['MM', 'SP', 'PR', 'BO'],
      }

      categories_children = {'MANAGEMENT' => {}, 'INVESTMENT' => {}, 'PROFIT' => {}, 'OTHER' => {}, 'UNKNOWN' => {}}
      result_matrix.each do |tag, value|
        found = false
        categories.each do |category_tag, tags|
          if tags.index(tag)
            value.each do |key, hour|
              if key != 'children'
                result_matrix[category_tag][key] = (result_matrix[category_tag][key] || 0) + hour # TODO: check
              end
            end
            categories_children[category_tag][tag] = result_matrix.delete(tag)
            found = true
          end
        end
        
        unless found || categories_children.keys.index(tag)
#          value.each do |date,hour|
#            result_matrix['UNKNOWN'][date] += hour
#          end
#          categories_children['UNKNOWN'][tag] = result_matrix.delete(tag)
          result_matrix.delete(tag)
        end

      end
      
      categories_children.each do |category_tag, children|
        result_matrix[category_tag]['children'] = children
      end
      
      # TOTALを計算
      total_matrix = result_template.clone
      result_matrix.each do |category_tag, value|
        value.each do |key, hour|
          if key != 'children'
            total_matrix[key] = (total_matrix[key] || 0) + hour # TODO: check
          end
        end
      end

      # 空のkey を挿入、project code を追加
      result_matrix.each do |category_tag, value|
        total_matrix.each do |key, value|
          result_matrix[category_tag][key] = result_matrix[category_tag][key] || 0
        end

        result_matrix[category_tag]['children'].each do |tag, value|
          total_matrix.each do |key, value|
            result_matrix[category_tag]['children'][tag][key] = result_matrix[category_tag]['children'][tag][key] || 0
          end

          if result_matrix[category_tag]['children'][tag]['children']
            result_matrix[category_tag]['children'][tag]['children'].each do |tag2, value|
              total_matrix.each do |key, value|
                result_matrix[category_tag]['children'][tag]['children'][tag2][key] = result_matrix[category_tag]['children'][tag]['children'][tag2][key] || 0
              end
            end


          end
        end
      end

      # Projectの情報を付加

#       response_data = []
#       
#       result_matrix.each do |tag, value|
#         result = []
#         total = 0
#         children = nil
#         result_matrix[tag].each do |date, hour|
#           if date == 'children'
#             children = hour
#           elsif date == 'total'
#             total = hour
#           else
#             result << {:date => date, :hour => hour}
#           end
#         end
#         
#         if children
#           response_data << {:tag => tag, :result => result, :total => total, :children => children}
#         else
#           response_data << {:tag => tag, :result => result, :total => total}
#         end
#       end

      response_data = to_response_object(result_matrix)
      
      total_result = []
      total= 0
      total_matrix.each do |date, hour|
        if date == 'total'
          total = hour
        else
          total_result << {:date => date, :hour => hour}
        end
      end
      
      response = {data: response_data, total: {result: total_result, total: total}}
      
      render :json => response
    end
    
    #
    # parameter
    #
    # until (iso date "YYYY/MM/DDTHH:MM:SSZ)
    # then
    #
    # group_by ("taggroup" | "tag")
    # users
    
    #
    def data_by_person
    
      date_since = params[:since].blank? ? Date.parse("2013-04-01") : Date.parse(params[:since])
      date_until = params[:until].blank? ? Date.today : Date.parse(params[:until]);
      username = params[:username]
      
      arel = Entry.where(:date => date_since .. date_until)
      arel = arel.where(:username => username) unless username.blank?
      result = arel.group(:username, :tag).sum(:hour)
      
      date_list = [
        'haruma@uniba.jp',
        'yui@uniba.jp',
        'rei@uniba.jp',
        'jun@uniba.jp',
        'sei@uniba.jp',
        'keiichi@uniba.jp',
        'tetsuro@uniba.jp',
        'saki@uniba.jp',
        'noriyuki@uniba.jp',
        'seiya@uniba.jp',
        'hideyuki@uniba.jp',
        'andre@uniba.jp',
        'mori@uniba.jp',
        'ogawa@uniba.jp',
        'daichi@uniba.jp',
        'fukuma@uniba.jp',
        'mizutani@uniba.jp',
        'takumi@uniba.jp',
        'ryo@uniba.jp',
        'mj@uniba.jp',
      ]
      
      result_template = {
        'haruma@uniba.jp' => 0,
        'yui@uniba.jp' => 0,
        'rei@uniba.jp' => 0,
        'jun@uniba.jp' => 0,
        'sei@uniba.jp' => 0,
        'keiichi@uniba.jp' => 0,
        'tetsuro@uniba.jp' => 0,
        'saki@uniba.jp' => 0,
        'noriyuki@uniba.jp' => 0,
        'seiya@uniba.jp' => 0,
        'hideyuki@uniba.jp' => 0,
        'andre@uniba.jp' => 0,
        'mori@uniba.jp' => 0,
        'ogawa@uniba.jp' => 0,
        'daichi@uniba.jp' => 0,
        'fukuma@uniba.jp' => 0,
        'mizutani@uniba.jp' => 0,
        'takumi@uniba.jp' => 0,
        'mj@uniba.jp' => 0,
        'total' => 0,
      }
      
      result_matrix = {}
      
      ['Pxxxx', 'Cxxxx', 'GROUP', 'INVESTMENT', 'PROFIT', 'MANAGEMENT', 'OTHER', 'UNKNOWN'].each do |category_tag|
        result_matrix[category_tag] = result_template.clone
      end

      # SQLの出力を二次元配列に変換する
      result.each do |row|
        username = row[0][0]
        tag = row[0][1]
        hour = row[1]
        
        next if tag.blank?
        
        next unless result_template[username]
        
        if result_matrix[tag].nil?
          result_matrix[tag] = result_template.clone
        end
        result_matrix[tag][username] = hour
      end
      
      # 各タグ毎のtotalを計算する
      result_matrix.each do |tag, value|
        value.each do |username, hour|
          result_matrix[tag]['total'] += hour unless username == 'total'
        end
      end
      
      # Pxxxx, Cxxxx, GROUP の合計を計算する
      p_children = {}
      c_children = {}
      group_children = {}
      result_matrix.each do |tag, value|
      
        # Pxxxx
        if /P\d{4}/ =~ tag
          value.each do |username, hour|
            result_matrix['Pxxxx'][username] += hour
          end
          p_children[tag] = result_matrix.delete(tag)
        end

        # Cxxxx
        if /C\d{4}/ =~ tag
          value.each do |username, hour|
            result_matrix['Cxxxx'][username] += hour
          end
          c_children[tag] = result_matrix.delete(tag)
        end

        # GROUP
        if ['R', 'S', 'J', 'H', 'I', 'A', 'D', 'P', 'V', 'DSP'].index(tag)
          value.each do |username, hour|
            result_matrix['GROUP'][username] += hour
          end
          group_children[tag] = result_matrix.delete(tag)
        end

      end
      result_matrix['Pxxxx']['children'] = p_children
      result_matrix['Cxxxx']['children'] = c_children
      result_matrix['GROUP']['children'] = group_children
      
      # category毎の合計を計算する
      categories = {
        'INVESTMENT' => ['LAB', 'ME', 'GROUP', 'Cxxxx'],
        'PROFIT' => ['Pxxxx', 'CR'],
        'MANAGEMENT' => ['MM', 'SP', 'PR', 'BO'],
      }

      categories_children = {'MANAGEMENT' => {}, 'INVESTMENT' => {}, 'PROFIT' => {}, 'OTHER' => {}, 'UNKNOWN' => {}}
      result_matrix.each do |tag, value|
        found = false
        categories.each do |category_tag, tags|
          if tags.index(tag)
            value.each do |username, hour|
              if username != 'children'
                result_matrix[category_tag][username] += hour
              end
            end
            categories_children[category_tag][tag] = result_matrix.delete(tag)
            found = true
          end
        end
        
        unless found || categories_children.keys.index(tag)
#          value.each do |date,hour|
#            result_matrix['UNKNOWN'][date] += hour
#          end
#          categories_children['UNKNOWN'][tag] = result_matrix.delete(tag)
          result_matrix.delete(tag)
        end

      end
      
      categories_children.each do |category_tag, children|
        result_matrix[category_tag]['children'] = children
      end
      
      # TOTALを計算
      total_matrix = result_template.clone
      result_matrix.each do |category_tag, value|
        value.each do |username, hour|
          if username != 'children'
            total_matrix[username] += hour
          end
        end
      end

#       response_data = []
#       
#       result_matrix.each do |tag, value|
#         result = []
#         total = 0
#         children = nil
#         result_matrix[tag].each do |date, hour|
#           if date == 'children'
#             children = hour
#           elsif date == 'total'
#             total = hour
#           else
#             result << {:date => date, :hour => hour}
#           end
#         end
#         
#         if children
#           response_data << {:tag => tag, :result => result, :total => total, :children => children}
#         else
#           response_data << {:tag => tag, :result => result, :total => total}
#         end
#       end
      
      response_data = to_response_object(result_matrix)
      
      total_result = []
      total= 0
      total_matrix.each do |key, hour|
        if key == 'total'
          total = hour
        else
          total_result << {:key => key, :hour => hour}
        end
      end
      
      response = {data: response_data, total: {result: total_result, total: total}}
      
      render :json => response
    end
    
    def to_response_object(hash)
    
      response_object = []
    
      hash.each do |tag, value|
        result = []
        total = 0
        children = nil
        hash[tag].each do |key, hour|
          if key == 'children'
            children = hour
          elsif key == 'total'
            total = hour
          else
            result << {:key => key, :hour => hour}
          end
        end

        project = Project.find_by_tag(tag)
        if project
          logger.debug(project)
          code = project.code
        end

        
        if children
          response_object << {:tag => tag, :code => code, :result => result, :total => total, :children => self.to_response_object(children)}
        else
          response_object << {:tag => tag, :code => code, :result => result, :total => total}
        end
        
      end
      response_object
      
    end

  end
  
end
