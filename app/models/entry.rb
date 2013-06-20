#encoding: utf-8

  class Entry < ActiveRecord::Base

    module Attendance
      DEFAULT = 0
      INVITED = 1
      ACCEPTED = 2
      ENTATIVE = 3
      DECLINED = 4
    end
  
    def short_week_date
      week_date.strftime("%m-%d")
    end
  
    def default?
      Attendance::DEFAULT == self.attendance
    end
  
    def invited?
      Attendance::INVITED == self.attendance
    end
  
    def accepted?
      Attendance::ACCEPTED == self.attendance
    end
  
    def entative?
      Attendance::ENTATIVE == self.attendance
    end
  
    def declined?
      Attendance::DECLINED == self.attendance
    end
  
    private
  
    def self.quater(year, month)
      quart = quart(month)
  
      if quart == 4
        year -= 1
        return "#{year}-#{quart}Q"
      else
        return "#{year}-#{quart}Q"
      end
    end
  
    def self.quart(num)
      if 1 <= num and num <= 3 then
        4
      elsif 4 <= num and num <= 6 then
        1
      elsif 7 <= num and num <= 9 then
        2
      elsif 10 <= num then
        3
      end
    end
  
    def self.attendance(status)
      if status
        attendance_o = status.attribute('value').to_s
        attendance_s = attendance_o.slice(/[a-z]+$/)
        attendance = attendee(attendance_s).to_i
      else
        attendance = 0
      end
      return attendance
    end
  
    def self.attendee(str)
      if str =~ /invited/ then
        1
      elsif str =~ /accepted/ then
        2
      elsif str =~ /entative/ then
        3
      elsif str =~ /declined/ then
        4
      else
        0
      end
    end
  end
