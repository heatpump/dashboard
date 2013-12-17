// Place all the behaviors and hooks related to the matching controller here.
// All this logic will automatically be available in application.js.

/**
 * Flagship class
 *
 * 設計:
 *
 * domへのattachと、data、optionの変更というinterface
 * dataが追加される / optionが変更されると、updateが呼ばれる
 * updateはdomにattachされていない状態でも失敗はしない
 * 
 * @constructor
 */
function Flagship(graphSelector, tableSelector, dashboard) {
  
  /**
   * Constants / Configurations
   *
   */

  // datasource url
  this.api = "/dashboard/api/flagship.json";
  
  // select
  this.graph = undefined;
  this.table = undefined;
  this.dashboard = dashboard;

  // data holder
  this.data = undefined;

  if (this.dashboard) {
    this.margin = {top: 20, right: 20, bottom: 40, left: 100};
    this.width = 540 - this.margin.left - this.margin.right;
    this.height = 230 - this.margin.top - this.margin.bottom;
  } else {
    this.margin = {top: 20, right: 20, bottom: 40, left: 100};
    this.width = 1170 - this.margin.left - this.margin.right;
    this.height = 500 - this.margin.top - this.margin.bottom;
  }
    
  // d3 elements
  this.time_scale = d3.time.scale();

  this.count_scale = d3.scale.linear()
    .range([this.height, 0]);

  this.color_scale = d3.scale.category20();
    
  this.attachTo(graphSelector, tableSelector);
  this.load();
}


/**
 * attachTo
 *
 */
Flagship.prototype.attachTo = function(graphSelector, tableSelector) {

  this.dateformat = d3.time.format('%Y/%m/%d');
  
  if (graphSelector) {

    this.graph = d3.select(graphSelector);
    
    // clear
    this.graph.selectAll("div").remove();

	var barchart = this.graph.append("div").attr("class", "tab-pane active").attr("id", "barchart").append("svg")
	    .attr("width", this.width + this.margin.left + this.margin.right)
	    .attr("height", this.height + this.margin.top + this.margin.bottom)
	    .attr("class", "barchart")
	  .append("g")
	    .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
	    
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
    
    var month_table = this.table.append("table").attr("class", "table table-bordered");
    
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
Flagship.prototype.load = function() {
  var self = this;
  
  var since = $("#since").val() || '2013-04-01';
  var until = $("#until").val() || '2014-03-31';
  var split = $("#split").val() || 'month';
  var group = $("#group").val() || 'account';

  d3.json(this.api + "?split=" + split + "&group=" + group + "&since=" + since + "&until=" + until, function(response) {
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
Flagship.prototype.update = function() {
  var format = d3.format(".2f");
  var self = this;

  if(this.graph) {
    /*
     * barchart
     */
    var duration = 1000;

    var stack = d3.layout.stack()
      .values(function(d) {return d.counts})
      .x(function(d) {return d.until})
      .y(function(d) {return d.count});
    
    var layers = stack(this.data);

    var since = $("#since").val() || '2013-04-01';
    var until = $("#until").val() || '2014-03-31';
    var split = $('#split').val() || 'month';


    this.barWidth = this.width / this.data[0].counts.length * 0.8;
    this.time_scale
      .domain([new Date(since), new Date(until)])
      .range([0, this.width]);

    if ($('#scale-checkbox').prop('checked')) {
      this.count_scale.domain([0, 2000])
    } else {
      this.count_scale.domain([0, d3.max(layers, function(d) { return d3.max(d.counts, function(d) { return d.y0 + d.y}) })])
    }

    var time_axis = d3.svg.axis()
      .scale(this.time_scale)
      .orient("bottom");

    if(this.dashboard) {
		  time_axis.tickFormat(d3.time.format('%-m'));
    } else {
      if (split == 'week' || split == 'day') {
        time_axis.tickFormat(d3.time.format('%Y/%-m/%-d'));
      } else {
        time_axis.tickFormat(d3.time.format('%Y/%-m'));
      }
    }
      
    this.count_axis = d3.svg.axis()
      .scale(this.count_scale)
      .orient("left");

    this.graph.select("svg.barchart").selectAll("g.x.axis").data(['']).enter().append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(" + this.margin.left + "," + (this.height + this.margin.top )+ ")");
    this.graph.select("svg.barchart g.x.axis")
      .call(time_axis);

    var yAxis = this.graph.select("svg.barchart").selectAll("g.y.axis").data(['']);

    yAxis.transition()
      .duration(duration)
      .call(this.count_axis);

    yAxis.enter().append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
      .call(this.count_axis)
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .attr("text-anchor", "end")
        .text("Views");

    this.graph.selectAll("svg.barchart g .layer").remove();

    var layer = this.graph.select("svg.barchart g").selectAll(".layer")
        .data(layers)
      .enter().append("g")
        .attr("class", "layer")
        .style("fill", function(d, index) { return self.color_scale(index); });

    var rect = layer.selectAll("rect")
        .data(function(d) { return d.counts.map(function(element) { 
          element.label = d.label;
          element.account = d.account;
          element.service = d.service;
          return element; }) })
      .enter().append("rect")
      .on("mouseover", function(d) {
        d3.select(this).transition().style("opacity", "0.8");
        self.tooltip.style("visibility", "visible");
        self.tooltip.html("<strong>" + d.label + "</strong><br />from " + d.account + " @ " + d.service + "<br />" + self.dateformat(new Date(d.from)) + " : " + d.count + " Views" );
      })
      .on("mousemove", function(d) {
        self.tooltip.style("top", (d3.event.pageY - 10) + "px")
          .style("left",(d3.event.pageX + 10) + "px");
      })
      .on("mouseout", function(d) {
        d3.select(this).transition().style("opacity", "1");
        self.tooltip.style("visibility", "hidden");
      })

    this.graph.select("svg.barchart g").selectAll(".layer")
      .selectAll("rect")
        .transition()
        .duration(duration)
        .attr("x", function(d) { return self.time_scale(Date.parse(d.from)) })
        .attr("y", function(d) { return self.count_scale(d.y0 + d.y); })
        .attr("width", function(d) { return self.time_scale(Date.parse(d.until)) - self.time_scale(Date.parse(d.from)) })
        .attr("height", function(d) { return self.count_scale(d.y0) - self.count_scale(d.y0 + d.y); })
  }

  if(this.table) {

    var thead_tr = self.table.select("table thead").selectAll("tr").data([""]).enter().append("tr");
    thead_tr.append("th").text("項目");
    var th_item = self.table.select("table thead tr").selectAll("th.item").data(self.data[0].counts);

    th_item.enter().append("th").attr("class", "item");
    th_item.exit().remove();
    th_item.text(function(d) { return self.dateformat(new Date(d.from)); });
  
    var tr = self.table.select('table tbody').selectAll("tr").data(self.data);
    tr.enter().append("tr").append("th");
    tr.exit().remove();

    tr.select('th').text(function(d) { return d.label; });
    var td = tr.selectAll("td").data(function(d) { return d.counts; });
    td.enter().append("td").classed("amount", true);
    td.exit().remove();
    td.text(function(d) { return d.count; });
  }

}


Flagship.prototype.change = function() {

  this.update();
}