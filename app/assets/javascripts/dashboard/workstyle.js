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
function Workstyle(graphSelector, tableSelector) {
  
  /**
   * Constants / Configurations
   *
   */
  
  // datasource url
  this.datasource = "/dashboard/api/workstyle.json";
  
  // data holder
  this.data = undefined;
  

  this.margin = {top: 20, right: 20, bottom: 40, left: 100};
  this.width = 1170 - this.margin.left - this.margin.right;
  this.height = 500 - this.margin.top - this.margin.bottom;
    
  // d3 elements
  this.time_scale = d3.time.scale()
    .domain([new Date('2013/04/01'), new Date('2014/03/01')])
    .range([0, this.width]);
    
  this.time_scale2 = d3.scale.ordinal()
    .rangeRoundBands([0, this.width], .3);
    
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
        "OTHER"])
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
      "rgb(255,252,65)"]);
    
  // select
  this.graph = undefined;
  this.table = undefined;
  
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
    this.graph.selectAll("svg").remove();

    var barchart = this.graph.append("svg")
          .attr("width", this.width + this.margin.left + this.margin.right)
          .attr("height", this.height + this.margin.top + this.margin.bottom)
          .attr("class", "barchart")
        .append("g")
          .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
          .attr("id", "barchart");
    
    var piechart = this.graph.append("svg")
          .attr("width", this.width + this.margin.left + this.margin.right)
          .attr("height", this.height + this.margin.top + this.margin.bottom)
          .attr("class", "piechart")
        .append("g")
          .attr("id", "piechart")
          .attr("transform", "translate(" + (this.width + this.margin.left + this.margin.right) / 2 + "," + (this.height + this.margin.top + this.margin.bottom) / 2 + ")");
    
    // initialize tooltip
    this.graph.select("div").remove()
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
    this.table.select("table").remove();
    
    var table = this.table.append("table").attr("class", "table table-bordered");
    
    table.append("thead");
    table.append("tfoot");
    table.append("tbody");
    
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
  d3.json(this.datasource, function(response) {

    self.data = response;
    
    self.update();
  });
}

/**
 * update visualize
 *
 * @param {Object} data
 *
 */
Workstyle.prototype.update = function() {

  var format = d3.format(".2f");

  // 第二階層を取得
  
  var data_replace = [];
  
  this.data.data.forEach(function(d) {
    console.log(d);
    if (d['children'] && d['tag'] != 'OTHER') {
      d['children'].forEach(function(d) {
        data_replace.push(d);
      })
    } else {
      data_replace.push(d);
    }
  })
  
  this.data.data_2nd = data_replace;

  if(this.graph) {
    /*
     * barchart
     */
   
    var stack = d3.layout.stack()
      .values(function(d) {return d.result})
      .x(function(d) {return d.date})
      .y(function(d) {return d.hour});
    
    var layers = stack(this.data.data_2nd);

    this.time_scale2.domain(['2013-04-01', '2013-05-01', '2013-06-01', '2013-07-01', '2013-08-01', '2013-09-01', '2013-10-01', '2013-11-01', '2013-12-01', '2014-01-01', '2014-02-01', '2014-03-01']);
    this.hour_scale.domain([0, d3.max(layers, function(d) { return d3.max(d.result, function(d) { return d.y0 + d.y}) })])

    var time_axis = d3.svg.axis()
      .scale(this.time_scale2)
      .orient("bottom");
      
    var hour_axis = d3.svg.axis()
      .scale(this.hour_scale)
      .orient("left");
    
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
    
    var self = this;
    var layer = this.graph.select("#barchart").selectAll(".layer")
        .data(layers)
      .enter().append("g")
        .attr("class", "layer")
        .style("fill", function(d) { return self.color_scale(d.tag); });
    
    var total = {};
    this.data.total.result.forEach(function(entry) {
      total[entry.date] = entry.hour;
    });
    
    var rect = layer.selectAll("rect")
        .data(function(d) { return d.result.map(function(element) { 
          element.tag = d.tag;
          element.rate = format(element.hour / total[element.date] * 100);
          return element; }) })
      .enter().append("rect")
        .attr("x", function(d) { return self.time_scale2(d.date); })
        .attr("y", function(d) { return self.hour_scale(d.y0 + d.y); })
        .attr("width", this.time_scale2.rangeBand())
        .attr("height", function(d) { return self.hour_scale(d.y0) - self.hour_scale(d.y0 + d.y); })
        
      .on("mouseover", function(d) {
        d3.select(this).transition().style("opacity", "0.8");
        self.tooltip.style("visibility", "visible");
        self.tooltip.html("<strong>" + d.tag + "</strong><br />" + d.date.substr(0,7) + " : " + format(d.hour) + "h (" + d.rate + "%)" );
      })
      .on("mousemove", function(d) {
        self.tooltip.style("top", (d3.event.pageY - 10) + "px")
          .style("left",(d3.event.pageX + 10) + "px");
      })
      .on("mouseout", function(d) {
        d3.select(this).transition().style("opacity", "1");
        self.tooltip.style("visibility", "hidden");
        
      })

    var bar_legend = d3.select("svg.barchart").selectAll(".legend")
        .data(this.data.data_2nd)
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

    /*
     * piechart (累計割合)
     */
    var radius = 200;
    
    var inner_arc = d3.svg.arc()
      .outerRadius(200)
      .innerRadius(0);

    var outer_arc = d3.svg.arc()
      .outerRadius(250)
      .innerRadius(210);

    var pie = d3.layout.pie()
      .sort(null)
      .value(function(d) { return d.total });
    
    var total = this.data.total.total;
    
    var g = d3.select("#piechart").selectAll(".inner_arc")
      .data(pie(this.data.data_2nd))
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
    g.append("text")
        .attr("transform", function(d) { return "translate(" + inner_arc.centroid(d) + ")"; })
        .attr("dy", ".35em")
        .style("text-anchor", "middle")
        .text(function(d) { return format(d.data.total / total * 100) + "%"; });

    g = d3.select("#piechart").selectAll(".outer_arc")
      .data(pie(this.data.data))
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


    var pie_legend = d3.select("svg.piechart").selectAll(".legend")
        .data(this.data.data_2nd)
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
  
  if(this.table) {
  
    var head_row = this.table.select("thead").append("tr");
    head_row.append("th").text("TAG");
    head_row.selectAll("th.date").data(this.data.data[0].result)
      .enter()
      .append("th")
      .attr("class", "date")
      .text(function(d) { return d.date.substr(0,7); });
  
    var tr = this.table.select("tbody")
      .selectAll("tr")
      .data(this.data.data_2nd)
      .enter()
      .append("tr")
    tr.append("th").text(function(d) { return d.tag; });
    tr.selectAll("td").data(function(d) {return d.result; })
      .enter()
      .append("td")
      .attr("class", "hour")
      .text(function(d) { return format(d.hour) + "h"; });

    var foot_row = this.table.select("tfoot").append("tr");
    foot_row.append("th").text("TOTAL");
    foot_row.selectAll("th.total").data(this.data.total.result)
      .enter()
      .append("th")
      .attr("class", "total hour")
      .text(function(d) { return format(d.hour) + "h"});

  }
}

/**
 * ready時に実行
 *
 */
$(function(){
  var workstyle = new Workstyle("#graph", "#table");
});