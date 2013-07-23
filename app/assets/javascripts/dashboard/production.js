// Place all the behaviors and hooks related to the matching controller here.
// All this logic will automatically be available in application.js.

/**
 * Production class
 *
 * 設計:
 *
 * domへのattachと、data、optionの変更というinterface
 * dataが追加される / optionが変更されると、updateが呼ばれる
 * updateはdomにattachされていない状態でも失敗はしない
 * 
 * @constructor
 */
function Production(graphSelector, tableSelector) {

  // datasource url
  this.api = "/dashboard/api/production.json";

  // select
  this.graph = undefined;
  this.table = undefined;
  
  this.margin = {top: 20, right: 20, bottom: 40, left: 100};
  this.width = 1170 - this.margin.left - this.margin.right;
  this.height = 500 - this.margin.top - this.margin.bottom;
  
  this.attachTo(graphSelector, tableSelector);
  this.load();

}

/**
 * attachTo
 *
 */
Production.prototype.attachTo = function(graphSelector, tableSelector) {

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
    
    var table = this.table.append("table").attr("class", "table table-bordered projects");
    
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
Production.prototype.load = function() {

  var self = this;
  
  d3.json(this.api, function(response) {

    console.log(response);
    self.data = response;
    
    self.update();
  });

}

Production.prototype.update = function() {

  var rate_format = d3.format("3,.2f");
  var amount_format = d3.format("3,f");

  var self = this;
  
  var data_replace = [];
  
  if(this.table) {
  
    var table = this.table.select("table.projects");

    /*
    table.selectAll("thead tr").remove();
  */

    var head_row = table.select("thead").append("tr");
    head_row.append("th").text("TAG");
    head_row.append("th").text("PJコード");
    head_row.append("th").text("タイトル");
    head_row.append("th").text("顧客名");
  
    head_row.append("th").text("開始");
    head_row.append("th").text("終了");
    head_row.append("th").text("売上");
    head_row.append("th").text("人件費");
    head_row.append("th").text("立替費用");
    head_row.append("th").text("外注費・原価");
    head_row.append("th").text("利益");
  
    table.selectAll("tbody tr").remove();
    
    this.data.sort(function(a,b) {
      return a.tag.localeCompare(b.tag);
    });
    
    
    var tr = table.select("tbody")
      .selectAll("tr")
      .data(this.data.filter(function(d) { return d.finished && d.tag.charAt(0) == 'P'}))
      .enter()
      .append("tr");

    tr.each(function(d) {
    
      var tr = d3.select(this);
      tr.append("th").text(d.tag)
      tr.append("th").text(d.code)
      tr.append("td").text(d.title)
      tr.append("td").text(d.client)

      tr.append("td").text(d.start_date)
      tr.append("td").text(d.finish_date)
      tr.append("td").classed("amount", true).text(amount_format(d.sales_result))
      tr.append("td").classed("amount", true).text(amount_format(d.staff_cost_result))
      tr.append("td").classed("amount", true).text(amount_format(d.temporary_cost_result))
      tr.append("td").classed("amount", true).text(amount_format(d.cost_result))
      tr.append("td").classed("amount", true).text(amount_format(d.profit_result))

    });

    
    var total = {};
    total.sales_result = d3.sum(this.data, function(d) { return d.sales_result });
    total.staff_cost_result = d3.sum(this.data, function(d) { return d.staff_cost_result });
    total.temporary_cost_result = d3.sum(this.data, function(d) { return d.temporary_cost_result });
    total.cost_result = d3.sum(this.data, function(d) { return d.cost_result });
    total.profit_result = d3.sum(this.data, function(d) { return d.profit_result });

    var foot_row = table.select("tfoot").append("tr");
    foot_row.append("th").text("合計");
    foot_row.append("th");
    foot_row.append("th");
    foot_row.append("th");
    foot_row.append("th");
    foot_row.append("th");
    foot_row.append("th").classed('amount', true).text(amount_format(total.sales_result));
    foot_row.append("th").classed('amount', true).text(amount_format(total.staff_cost_result));
    foot_row.append("th").classed('amount', true).text(amount_format(total.temporary_cost_result));
    foot_row.append("th").classed('amount', true).text(amount_format(total.cost_result));
    foot_row.append("th").classed('amount', true).text(amount_format(total.profit_result));

    foot_row = table.select("tfoot").append("tr");
    foot_row.append("th").text("割合");
    foot_row.append("th");
    foot_row.append("th");
    foot_row.append("th");
    foot_row.append("th");
    foot_row.append("th");
    foot_row.append("th").classed('amount', true).text(rate_format(total.sales_result / total.sales_result * 100) + "%");
    foot_row.append("th").classed('amount', true).text(rate_format(total.staff_cost_result / total.sales_result * 100) + "%");
    foot_row.append("th").classed('amount', true).text(rate_format(total.temporary_cost_result / total.sales_result * 100) + "%");
    foot_row.append("th").classed('amount', true).text(rate_format(total.cost_result / total.sales_result * 100) + "%");
    foot_row.append("th").classed('amount', true).text(rate_format(total.profit_result / total.sales_result * 100) + "%");


    

  }
}

