// Place all the behaviors and hooks related to the matching controller here.
// All this logic will automatically be available in application.js.

/**
 * Workstyle class
 *
 * 設計:
 *
 * domへのattachと、data、optionの変更というinterface
 * dataが追加される / optionが変更されると、updateが呼ばれる
 * updateはdomにattachされていない状態でも失敗はしない
 * 
 * @constructor
 */
function Workstyle(graphSelector, tableSelector, dashboard) {
  
  /**
   * Constants / Configurations
   *
   */

  // datasource url
  this.api_by_month = "/dashboard/api/workstyle/by_month.json";
  this.api_by_person = "/dashboard/api/workstyle/by_person.json";
  this.api_check = "/dashboard/api/workstyle/by_person.json";
  
  // select
  this.graph = undefined;
  this.table = undefined;
  this.dashboard = dashboard;

  // data holder
  this.data_by_month = undefined;
  this.data_by_person = undefined;
  this.data_check = undefined;

  if (this.dashboard) {
    this.margin = {top: 20, right: 20, bottom: 40, left: 100};
    this.width = 460 - this.margin.left - this.margin.right;
    this.height = 230 - this.margin.top - this.margin.bottom;
    this.barWidth = this.width / 12 * 0.8;
  } else {
    this.margin = {top: 20, right: 20, bottom: 40, left: 100};
    this.width = 1170 - this.margin.left - this.margin.right;
    this.height = 500 - this.margin.top - this.margin.bottom;
    this.barWidth = this.width / 12 * 0.8;
  }
    
  // d3 elements
  this.time_scale = d3.time.scale()
    .domain([new Date('2013/04/01'), new Date('2014/03/01')])
    .range([this.barWidth, this.width - this.barWidth]);
    
  this.hour_scale = d3.scale.linear()
    .domain([0, 2000])
    .range([this.height, 0]);
  this.color_scale = d3.scale.ordinal()
    .domain([
      "INVESTMENT",
        "LAB",
        "GROUP",
        "ME",
        "Cxxxx",
      "PROFIT",
        "Pxxxx",
        "CR",
      "MANAGEMENT",
        "MM",
        "BO",
        "SP",
        "PR",
        "OTHER",
        "UNKNOWN"])
    .range([
      "rgb(254,112,56)",
        "rgb(253,134,71)",
        "rgb(253,165,125)",
        "rgb(254,196,171)",
        "rgb(252,106,33)",
      "rgb(98,147,254)",
        "rgb(58,136,251)",
        "rgb(116,167,252)",
      "rgb(0,145,206)",
        "rgb(21,140,180)",
        "rgb(26,163,215)",
        "rgb(83,212,253)",
        "rgb(0,145,206)",
      "rgb(255,252,65)",
      "rgb(200,200,200)"]);
    
  
  this.attachTo(graphSelector, tableSelector);
  this.load();
}


/**
 * attachTo
 *
 */
Workstyle.prototype.attachTo = function(graphSelector, tableSelector) {
  
  if (graphSelector) {
    this.graph = d3.select(graphSelector);
    
    // clear
    this.graph.selectAll("div").remove();

    if (!this.dashboard) {
      var barchart = this.graph.append("div").attr("class", "tab-pane active").attr("id", "barchart").append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .attr("class", "barchart")
          .append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
    }
    
    var piechart = this.graph.append("div").attr("class", "tab-pane").attr("id", "piechart").append("svg")
          .attr("width", this.width + this.margin.left + this.margin.right)
          .attr("height", this.height + this.margin.top + this.margin.bottom)
          .attr("class", "piechart")
        .append("g")
          .attr("transform", "translate(" + (this.width + this.margin.left + this.margin.right) / 2 + "," + (this.height + this.margin.top + this.margin.bottom) / 2 + ")");
    
    if (!this.dashboard) {
      var usertable = this.graph.append("div").attr("class", "tab-pane").attr("id", "user_table")
    
      var person_table = usertable.append("table").attr("class", "table table-bordered person");
      person_table.append("thead");
      person_table.append("tfoot");
      person_table.append("tbody");
    }

    // initialize tooltip
    this.tooltip = this.graph
      .append("div")
        .style("position", "absolute")
        .style("z-index", "10")
        .style("visibility", "hidden")
        .text("a simple tooltip")
        .attr("class", "data-tooltip");
        
  } else {
    this.graph = undefined;
  }
  
  if (tableSelector) {
    this.table = d3.select(tableSelector);
    
    // clear
    this.table.selectAll("table").remove();
    
    var month_table = this.table.append("table").attr("class", "table table-bordered month");
    
    month_table.append("thead");
    month_table.append("tfoot");
    month_table.append("tbody");

    
  } else {
    this.table = undefined;
  }
}

/**
 * load data
 *
 * @param {string} file
 *
 */
Workstyle.prototype.load = function() {
  var self = this;
  
  var since = $("#since").val() || '2013-04-01';
  var until = $("#until").val() || '2014-03-31';
  var username = $("#username").val() || '';
  
  d3.json(this.api_by_month + "?since=" + since + "&until=" + until + "&username=" + username, function(response) {

    self.data_by_month = response;
    
    self.update_month();
  });

  d3.json(this.api_by_person + "?since=" + since + "&until=" + until + "&username=" + username, function(response) {

    self.data_by_person = response;
    
    self.update_person();
  });

}

/**
 * update visualize
 *
 * @param {Object} data
 *
 */
Workstyle.prototype.update_month = function() {

  var format = d3.format(".2f");
    var self = this;

  // 第二階層を取得
  
  var data_replace = [];
  
  this.data_by_month.data.forEach(function(d) {
    if (d['children'] && d['tag'] != 'UNKNOWN' && d['tag'] != 'OTHER') {
      d['children'].forEach(function(d) {
        data_replace.push(d);
      })
    } else {
      data_replace.push(d);
    }
  })
  
  this.data_by_month.data_2nd = data_replace;

  if(this.graph && !this.dashboard) {
    /*
     * barchart
     */
   
    var stack = d3.layout.stack()
      .values(function(d) {return d.result})
      .x(function(d) {return d.key})
      .y(function(d) {return d.hour});
    
    var layers = stack(this.data_by_month.data_2nd);

    this.hour_scale.domain([0, d3.max(layers, function(d) { return d3.max(d.result, function(d) { return d.y0 + d.y}) })])

    var time_axis = d3.svg.axis()
      .scale(this.time_scale)
      .tickFormat(d3.time.format('%Y/%m'))
      .orient("bottom");
      
    var hour_axis = d3.svg.axis()
      .scale(this.hour_scale)
      .orient("left");
    
    this.graph.select("svg.barchart").selectAll("g.axis").remove();
    
    this.graph.select("svg.barchart").append("g")
      .attr("class", "x axis")
      .attr("transform", "translate("+ this.margin.left +"," + (this.height + this.margin.top )+ ")")
      .call(time_axis);

    this.graph.select("svg.barchart").append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
      .call(hour_axis);
      
    d3.select(".y.axis")
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .attr("text-anchor", "end")
        .text("Hours");
    
    this.graph.select("svg.barchart g").selectAll(".layer").remove();
    var layer = this.graph.select("svg.barchart g").selectAll(".layer")
        .data(layers)
      .enter().append("g")
        .attr("class", "layer")
        .style("fill", function(d) { return self.color_scale(d.tag); });
    
    var total = {};
    this.data_by_month.total.result.forEach(function(entry) {
      total[entry.key] = entry.hour;
    });
    
    var rect = layer.selectAll("rect")
        .data(function(d) { return d.result.map(function(element) { 
          element.tag = d.tag;
          element.rate = format(element.hour / total[element.key] * 100);
          return element; }) })
      .enter().append("rect")
        .attr("x", function(d) { return self.time_scale(new Date(d.key)) - self.barWidth / 2; })
        .attr("y", function(d) { return self.hour_scale(d.y0 + d.y); })
        .attr("width", this.barWidth)
        .attr("height", function(d) { return self.hour_scale(d.y0) - self.hour_scale(d.y0 + d.y); })
        
      .on("mouseover", function(d) {
        d3.select(this).transition().style("opacity", "0.8");
        self.tooltip.style("visibility", "visible");
        self.tooltip.html("<strong>" + d.tag + "</strong><br />" + d.key.substr(0,7) + " : " + format(d.hour) + "h (" + d.rate + "%)" );
      })
      .on("mousemove", function(d) {
        self.tooltip.style("top", (d3.event.pageY - 10) + "px")
          .style("left",(d3.event.pageX + 10) + "px");
      })
      .on("mouseout", function(d) {
        d3.select(this).transition().style("opacity", "1");
        self.tooltip.style("visibility", "hidden");
        
      })

    d3.selectAll("svg.barchart .legent").remove();
    var bar_legend = d3.select("svg.barchart").selectAll(".legend")
        .data(this.data_by_month.data_2nd)
      .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(" + (self.width - 100) + "," + (i * 20) + ")"; });
  
    bar_legend.append("rect")
        .attr("x", 140)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", function(d) { return self.color_scale(d.tag) } );
  
    bar_legend.append("text")
        .attr("x", 130)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function(d) { return d.tag; });
  }

  if(this.graph) {
    /*
     * piechart (累計割合)
     */
    var radius = ( this.height + this.margin.top + this.margin.bottom ) / 3;
    
    var inner_arc = d3.svg.arc()
      .outerRadius(radius)
      .innerRadius(0);

    var outer_arc = d3.svg.arc()
      .outerRadius(radius * 1.25)
      .innerRadius(radius * 1.05);

    var pie = d3.layout.pie()
      .sort(null)
      .value(function(d) { return d.total });
    
    var total = this.data_by_month.total.total;
    
    this.graph.selectAll("svg.piechart g g").remove();
    
    var g = this.graph.select("svg.piechart g").selectAll(".inner_arc")
      .data(pie(this.data_by_month.data_2nd))
      .enter().append("g")
        .attr("class", "inner_arc");
        
    g.append("path")
      .attr("d", inner_arc)
      .style("fill", function(d) { return self.color_scale(d.data.tag) })
      .on("mouseover", function(d) {
        d3.select(this).transition().style("opacity", "0.8");
        self.tooltip.style("visibility", "visible");
        self.tooltip.html("<strong>" + d.data.tag + "</strong><br />" + format(d.data.total) + "h (" + format(d.data.total / total * 100) + "%)" );
      })
      .on("mousemove", function(d) {
        self.tooltip.style("top", (d3.event.pageY - 10) + "px")
          .style("left",(d3.event.pageX + 10) + "px");
      })
      .on("mouseout", function(d) {
        d3.select(this).transition().style("opacity", "1");
        self.tooltip.style("visibility", "hidden");
        
      });

    if (!this.dashboard) {
      g.append("text")
          .attr("transform", function(d) { return "translate(" + inner_arc.centroid(d) + ")"; })
          .attr("dy", ".35em")
          .style("text-anchor", "middle")
          .text(function(d) { return format(d.data.total / total * 100) + "%"; });
    }

    g = d3.select("svg.piechart g").selectAll(".outer_arc")
      .data(pie(this.data_by_month.data))
      .enter().append("g")
        .attr("class", "outer_arc");
        
    g.append("path")
      .attr("d", outer_arc)
      .style("fill", function(d) { return self.color_scale(d.data.tag) })
      .on("mouseover", function(d) {
        d3.select(this).transition().style("opacity", "0.8");
        self.tooltip.style("visibility", "visible");
        self.tooltip.html("<strong>" + d.data.tag + "</strong><br />" + format(d.data.total) + "h (" + format(d.data.total / total * 100) + "%)" );
      })
      .on("mousemove", function(d) {
        self.tooltip.style("top", (d3.event.pageY - 10) + "px")
          .style("left",(d3.event.pageX + 10) + "px");
      })
      .on("mouseout", function(d) {
        d3.select(this).transition().style("opacity", "1");
        self.tooltip.style("visibility", "hidden");
        
      });

      g.append("text")
        .attr("transform", function(d) { return "translate(" + outer_arc.centroid(d) + ")"; })
        .attr("dy", ".35em")
        .style("text-anchor", "middle")
        .text(function(d) { return format(d.data.total / total * 100) + "%"; });

    if (!this.dashboard) {
      d3.selectAll("svg.piechart .legent").remove();
      var pie_legend = d3.select("svg.piechart").selectAll(".legend")
          .data(this.data_by_month.data_2nd)
        .enter().append("g")
          .attr("class", "legend")
          .attr("transform", function(d, i) { return "translate(" + (self.width - 100) + "," + (i * 20) + ")"; });
    
      pie_legend.append("rect")
          .attr("x", 140)
          .attr("width", 18)
          .attr("height", 18)
          .style("fill", function(d) { return self.color_scale(d.tag) } );
    
      pie_legend.append("text")
          .attr("x", 130)
          .attr("y", 9)
          .attr("dy", ".35em")
          .style("text-anchor", "end")
          .text(function(d) { return d.tag; });
    }

  }
  
  if(this.table) {
  
    var month_table = this.table.select("table.month");
    
    month_table.selectAll("thead tr").remove();
    
    var head_row = month_table.select("thead").append("tr");
    head_row.append("th").text("TAG");
    head_row.selectAll("th.date").data(this.data_by_month.data[0].result)
      .enter()
      .append("th")
      .attr("class", "date")
      .text(function(d) { return d.key.substr(0,7); });
  
    month_table.selectAll("tbody tr").remove();
    var tr = month_table.select("tbody")
      .selectAll("tr")
      .data(this.data_by_month.data_2nd)
      .enter()
      .append("tr");

    tr.append("th")
      .text(function(d) { return d.tag; })
      .style("background-color", function(d) { return self.color_scale(d.tag)});
    tr.selectAll("td").data(function(d) {return d.result; })
      .enter()
      .append("td")
      .attr("class", "hour")
      .text(function(d) { return format(d.hour) + "h"; });

    month_table.selectAll("tfoot tr").remove();
    var foot_row = month_table.select("tfoot").append("tr");
    foot_row.append("th").text("TOTAL");
    foot_row.selectAll("th.total").data(this.data_by_month.total.result)
      .enter()
      .append("th")
      .attr("class", "total hour")
      .text(function(d) { return format(d.hour) + "h"});

  }
}

/**
 * update visualize
 *
 * @param {Object} data
 *
 */
Workstyle.prototype.update_person = function() {

  var self = this;
  var format = d3.format(".2f");
  // 第二階層を取得
  
  var data_replace = [];
  
  this.data_by_person.data.forEach(function(d) {
    if (d['children'] && d['tag'] != 'UNKNOWN' && d['tag'] != 'OTHER') {
      d['children'].forEach(function(d) {
        data_replace.push(d);
      })
    } else {
      data_replace.push(d);
    }
  })
  
  this.data_by_person.data_2nd = data_replace;

  if(this.table) {
  
    var person_table = this.graph.select("table.person");

    person_table.selectAll("thead tr").remove();
    
    var name_map = {
        'haruma@uniba.jp' : '菊地',
        'yui@uniba.jp' : '五木田',
        'rei@uniba.jp' : '河合',
        'jun@uniba.jp' : '小松',
        'sei@uniba.jp' : '片岡',
        'keiichi@uniba.jp' : '谷藤',
        'tetsuro@uniba.jp' : '志村',
        'saki@uniba.jp' : '内山',
        'noriyuki@uniba.jp' : '清水',
        'seiya@uniba.jp' : '今野',
        'hideyuki@uniba.jp' : '齋藤',
        'andre@uniba.jp' : 'アンドレ',
        'mori@uniba.jp' : '森',
        'ogawa@uniba.jp' : '小川',
        'daichi@uniba.jp' : '佐藤',
        'fukuma@uniba.jp' : '福間',
        'mizutani@uniba.jp' : '水谷',
        'takumi@uniba.jp' : '阿部',
        'ryo@uniba.jp' : '村山',
    }
    
    var tag_scale = d3.scale.ordinal().domain(['MM', 'SP', 'BO', 'PR', 'LAB', 'ME', 'GROUP', 'Cxxxx', 'Pxxxx', 'CR', 'OTHER']).range([1,2,3,4,5,6,7,8,9,10,11,12]);
    
    this.data_by_person.data_2nd = this.data_by_person.data_2nd.sort(function(a, b) { return tag_scale(a.tag) - tag_scale(b.tag)});
    
    var head_row = person_table.select("thead").append("tr");
    head_row.append("th").text("TAG");
    head_row.selectAll("th.person").data(this.data_by_person.data[0].result)
      .enter()
      .append("th")
      .attr("class", "date")
      .text(function(d) { return name_map[d.key]; });
  
    person_table.selectAll("tbody tr").remove();
    var tr = person_table.select("tbody")
      .selectAll("tr")
      .data(this.data_by_person.data_2nd)
      .enter()
      .append("tr");

    tr.append("th")
      .text(function(d) { return d.tag; })
      .style("background-color", function(d) { return self.color_scale(d.tag)});
    tr.selectAll("td").data(function(d) {return d.result; })
      .enter()
      .append("td")
      .attr("class", "hour")
      .text(function(d) { return format(d.hour); });

    person_table.selectAll("tfoot tr").remove();
    var foot_row = person_table.select("tfoot").append("tr");
    foot_row.append("th").text("TOTAL");
    foot_row.selectAll("th.total").data(this.data_by_person.total.result)
      .enter()
      .append("th")
      .attr("class", "total hour")
      .text(function(d) { return format(d.hour)});

  }
}


