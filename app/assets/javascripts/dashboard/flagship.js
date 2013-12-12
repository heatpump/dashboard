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
  this.api = "/dashboard/api/flagship/accounts.json";
  
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
  } else {
    this.margin = {top: 20, right: 20, bottom: 40, left: 100};
    this.width = 1170 - this.margin.left - this.margin.right;
    this.height = 500 - this.margin.top - this.margin.bottom;
  }
    
  // d3 elements
  this.time_scale = d3.time.scale()
    .domain([new Date('2013/04/01'), new Date('2014/03/01')])
    .range([0, this.width]);
    
  this.time_scale2 = d3.scale.ordinal()
    .rangeRoundBands([0, this.width], .3);
    
  this.hour_scale = d3.scale.linear()
    .domain([0, 2000])
    .range([this.height, 0]);
  this.color_scale = d3.scale.category20c();
    
  this.attachTo(graphSelector, tableSelector);
  this.load();
}


/**
 * attachTo
 *
 */
Flagship.prototype.attachTo = function(graphSelector, tableSelector) {
  
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

}