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
    this.width = 460 - this.margin.left - this.margin.right;
    this.height = 230 - this.margin.top - this.margin.bottom;
    this.barWidth = Math.floor(this.width / 19) - 1;
  } else {
    this.margin = {top: 20, right: 20, bottom: 40, left: 100};
    this.width = 1170 - this.margin.left - this.margin.right;
    this.height = 500 - this.margin.top - this.margin.bottom;
    this.barWidth = Math.floor(this.width / 19) - 1;
  }
    
  // d3 elements
  this.time_scale = d3.time.scale()
    .domain([new Date('2013/04/01'), new Date('2014/03/01')])
    .range([this.barWidth / 2 + 20, this.width - this.barWidth / 2 - 20]);
    
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

  this.format = d3.time.format('%Y/%m');
  
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
  var username = $("#username").val() || '';
  
  d3.json(this.api, function(response) {

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
   
    var stack = d3.layout.stack()
      .values(function(d) {return d.counts})
      .x(function(d) {return d.until})
      .y(function(d) {return d.count});
    
    var layers = stack(this.data);

    this.count_scale.domain([0, d3.max(layers, function(d) { return d3.max(d.counts, function(d) { return d.y0 + d.y}) })])

    var time_axis = d3.svg.axis()
      .scale(this.time_scale)
      .orient("bottom");

    if(this.dashboard) {
		  time_axis.tickFormat(d3.time.format('%m'));
    } else {
      time_axis.tickFormat(d3.time.format('%Y/%m'));
    }
      
    var count_axis = d3.svg.axis()
      .scale(this.count_scale)
      .orient("left");
    
    this.graph.select("svg.barchart").selectAll("g.axis").remove();
    
    this.graph.select("svg.barchart").append("g")
      .attr("class", "x axis")
      .attr("transform", "translate("+ this.margin.left +"," + (this.height + this.margin.top )+ ")")
      .call(time_axis);

    this.graph.select("svg.barchart").append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
      .call(count_axis);
      
    this.graph.select(".y.axis")
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .attr("text-anchor", "end")
        .text("Views");
    console.log(layers);
    this.graph.select("svg.barchart g").selectAll(".layer").remove();
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
        .attr("x", function(d) { return self.time_scale(Date.parse(d.from)) - self.barWidth / 2; })
        .attr("y", function(d) { return self.count_scale(d.y0 + d.y); })
        .attr("width", this.barWidth)
        .attr("height", function(d) { return self.count_scale(d.y0) - self.count_scale(d.y0 + d.y); })

      .on("mouseover", function(d) {
        d3.select(this).transition().style("opacity", "0.8");
        self.tooltip.style("visibility", "visible");
        self.tooltip.html("<strong>" + d.label + "</strong><br />from " + d.account + " @ " + d.service + "<br />" + self.format(new Date(d.from)) + " : " + d.count + " Views" );
      })
      .on("mousemove", function(d) {
        self.tooltip.style("top", (d3.event.pageY - 10) + "px")
          .style("left",(d3.event.pageX + 10) + "px");
      })
      .on("mouseout", function(d) {
        d3.select(this).transition().style("opacity", "1");
        self.tooltip.style("visibility", "hidden");
        
      })

     /*
    d3.selectAll("svg.barchart .legend").remove();
    var bar_legend = d3.select("svg.barchart").selectAll(".legend")
        .data(this.data)
      .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(" + (self.width - 100) + "," + (i * 20) + ")"; });
  
    bar_legend.append("rect")
        .attr("x", 140)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", function(d, index) { return self.color_scale(index) } );
  
    bar_legend.append("text")
        .attr("x", 130)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function(d) { return d.label; });
     */
  }

  if(this.table) {

    var thead_tr = self.table.select("table thead").selectAll("tr").data([""]).enter().append("tr");
    thead_tr.append("th").text("項目");
    thead_tr.selectAll("th.month").data(self.data[0].counts).enter().append("th").attr("class", "month").text(function(d) { console.log(d); return self.format(new Date(d.from)); });
  
    var tr = self.table.select('table tbody').selectAll("tr").data(self.data).enter().append("tr");
    tr.append("th").text(function(d) { return d.label; });
    var append_td = tr.selectAll("td").data(function(d) { return d.counts; }).enter();
    append_td.append("td").classed("amount", true).text(function(d) { return d.count; });
  }

}