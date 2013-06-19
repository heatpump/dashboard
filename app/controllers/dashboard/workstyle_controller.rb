require_dependency "dashboard/application_controller"
require "heatpump-core/entry"

module Dashboard

  include HeatpumpCore

  class WorkstyleController < ApplicationController
    def index
      entry = HeatpumpCore::Entry
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
    def data
    
      date_since = params[:since].blank? ? Date.parse("2013-04-01") : Date.parse(params[:since])
      date_until = params[:until].blank? ? Date.today : Date.parse(params[:until]);
      username = params[:username]
      
      logger.debug(date_since)
      logger.debug(date_until)
      logger.debug(username)
      
      arel = HeatpumpCore::Entry.where(:date => date_since .. date_until)
      arel = arel.where(:username => username) unless username.blank?
      result = arel.group(:year, :month, :tag).sum(:hour)
      
      date_list = [
        '2013-04-01',
        '2013-05-01',
        '2013-06-01',
        '2013-07-01',
        '2013-08-01',
        '2013-09-01',
        '2013-10-01',
        '2013-11-01',
        '2013-12-01',
        '2014-01-01',
        '2014-02-01',
        '2014-03-01'
      ]
      
      result_template = {
        '2013-04-01' => 0,
        '2013-05-01' => 0,
        '2013-06-01' => 0,
        '2013-07-01' => 0,
        '2013-08-01' => 0,
        '2013-09-01' => 0,
        '2013-10-01' => 0,
        '2013-11-01' => 0,
        '2013-12-01' => 0,
        '2014-01-01' => 0,
        '2014-02-01' => 0,
        '2014-03-01' => 0,
        'total' => 0,
      }
      
      result_matrix = {}
      
      ['Pxxxx', 'Cxxxx', 'GROUP', 'INVESTMENT', 'PROFIT', 'MANAGEMENT', 'OTHER'].each do |category_tag|
        result_matrix[category_tag] = result_template.clone
      end

      # SQLの出力を二次元配列に変換する
      result.each do |row|
        year = row[0][0]
        month = row[0][1]
        tag = row[0][2]
        hour = row[1]
        
        next if tag.blank?
        
        date = sprintf("\%04d-\%02d-01", year.to_i, month.to_i)
        
        if result_matrix[tag].nil?
          result_matrix[tag] = result_template.clone
        end
        result_matrix[tag][date] = hour
      end
      
      # 各タグ毎のtotalを計算する
      result_matrix.each do |tag, value|
        value.each do |date, hour|
          result_matrix[tag]['total'] += hour unless date == 'total'
        end
      end
      
      # Pxxxx, Cxxxx, GROUP の合計を計算する
      p_children = {}
      c_children = {}
      group_children = {}
      result_matrix.each do |tag, value|
      
        # Pxxxx
        if /P\d{4}/ =~ tag
          value.each do |date, hour|
            result_matrix['Pxxxx'][date] += hour
          end
          p_children[tag] = result_matrix.delete(tag)
        end

        # Cxxxx
        if /C\d{4}/ =~ tag
          value.each do |date, hour|
            result_matrix['Cxxxx'][date] += hour
          end
          c_children[tag] = result_matrix.delete(tag)
        end

        # GROUP
        if ['R', 'S', 'J', 'H', 'I', 'A', 'D', 'P', 'V', 'DSP'].index(tag)
          value.each do |date, hour|
            result_matrix['GROUP'][date] += hour
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

      categories_children = {'MANAGEMENT' => {}, 'INVESTMENT' => {}, 'PROFIT' => {}, 'OTHER' => {}}
      result_matrix.each do |tag, value|
        found = false
        categories.each do |category_tag, tags|
          if tags.index(tag)
            value.each do |date, hour|
              if date != 'children'
                result_matrix[category_tag][date] += hour
              end
            end
            categories_children[category_tag][tag] = result_matrix.delete(tag)
            found = true
          end
        end
        
        unless found || categories_children.keys.index(tag)
          value.each do |date,hour|
            result_matrix['OTHER'][date] += hour
          end
          categories_children['OTHER'][tag] = result_matrix.delete(tag)
        end
      end
      
      categories_children.each do |category_tag, children|
        result_matrix[category_tag]['children'] = children
      end
      
      # TOTALを計算
      total_matrix = result_template.clone
      result_matrix.each do |category_tag, value|
        value.each do |date, hour|
          if date != 'children'
            total_matrix[date] += hour
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

    def to_response_object(hash)
    
      response_object = []
    
      hash.each do |tag, value|
        result = []
        total = 0
        children = nil
        hash[tag].each do |date, hour|
          if date == 'children'
            children = hour
          elsif date == 'total'
            total = hour
          else
            result << {:date => date, :hour => hour}
          end
        end
        
        if children
          response_object << {:tag => tag, :result => result, :total => total, :children => self.to_response_object(children)}
        else
          response_object << {:tag => tag, :result => result, :total => total}
        end
        
      end
      response_object
      
    end

  end
  
end