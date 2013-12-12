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
function Production(graphSelector, tableSelector, dashboard) {

  // datasource url
  this.api = "/dashboard/api/production.json";

  // select
  this.graph = undefined;
  this.table = undefined;
  this.dashboard = dashboard;

  this.margin = {top: 20, right: 320, bottom: 40, left: 100};
  this.width = 1170 - this.margin.left - this.margin.right;
  this.height = 500 - this.margin.top - this.margin.bottom;

  if (this.dashboard) {
    this.margin = {top: 20, right: 20, bottom: 40, left: 100};
    this.width = 460 - this.margin.left - this.margin.right;
    this.height = 230 - this.margin.top - this.margin.bottom;
  } else {
    this.margin = {top: 20, right: 20, bottom: 40, left: 100};
    this.width = 1170 - this.margin.left - this.margin.right;
    this.height = 500 - this.margin.top - this.margin.bottom;
  }
  
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
    
    // sales_data, staff_cost_data, cost_data, temporary_cost_data, profit_data にわける
    sales_data = [];
    cost_data = [];
    staff_cost_data = [];
    temporary_cost_data = [];
    profit_data = [];
    
    
    response.forEach(function(d) {

      if (d.finished && d.tag.charAt(0) == 'P') {
        sales_data.push({
          key: d.tag,
          values: [
          { 
            y: d.sales_result,
            x: 'sales',
          },
          { 
            y: d.cost_result,
            x: 'cost',
          },
          { 
            y: d.staff_cost_result,
            x: 'staff_cost',
          },
          { 
            y: d.temporary_cost_result,
            x: 'temporary_cost',
          },
          { 
            y: d.profit_result,
            x: 'profit',
          },
          
          ],
          project: d,
        });
      }
      
    })
    
    self.sales_data = sales_data;
    
    self.update();
  });

}

Production.prototype.update = function() {

  var rate_format = d3.format("3,.2f");
  var amount_format = d3.format("3,f");

  var self = this;
  
  var data_replace = [];

  if(this.graph) {
  
    var barchart = this.graph.select("svg.barchart");

    var stack = d3.layout.stack()
  //    .offset("wiggle")
      .values(function(d) { return d.values })
      .x(function(d, i) {return d.x})
      .y(function(d) { return d.y });
    
    var layers = stack(this.sales_data);

    var total_sales = d3.sum(layers, function(d) { return d.project.sales_result; })
    var total_staff_cost = d3.sum(layers, function(d) { return d.project.staff_cost_result; })
    var total_cost = d3.sum(layers, function(d) { return d.project.cost_result; })
    var total_temporary_cost = d3.sum(layers, function(d) { return d.project.temporary_cost_result; })
//    var total_profit = d3.sum(layers, function(d) { return d.project.profit_result; })
    var total_profit = d3.sum(this.sales_data, function(d) { return d.project.sales_result - (d.project.staff_cost_result + d.project.temporary_cost_result + d.project.cost_result) });
    
    
    var data_container = barchart.append("g")
      .attr("class", "data")
      .attr("text-anchor", "end")
      .attr("font-size", "12pt")
      .attr("transform", "translate(1060,80)")

    data_container.append("text").attr("x", -160).attr("y", 0).text("売上高 合計:");
    data_container.append("text").attr("y", 0).text(numberFormat(total_sales) + " 円");
    data_container.append("text").attr("x", -160).attr("y", 80).text("人件費 合計:");
    data_container.append("text").attr("y", 80).text(numberFormat(total_staff_cost) + " 円");
    data_container.append("text").attr("y", 110).text("(" + rate_format(total_staff_cost / total_sales * 100) + " %)").attr("fill", "darkgray");
    data_container.append("text").attr("x", -160).attr("y", 160).text("外注費 合計:");
    data_container.append("text").attr("y", 160).text(numberFormat(total_cost) + " 円");
    data_container.append("text").attr("y", 190).text("(" + rate_format(total_cost / total_sales * 100) + " %)").attr("fill", "darkgray");
    data_container.append("text").attr("x", -160).attr("y", 240).text("材料費 合計:");
    data_container.append("text").attr("y", 240).text(numberFormat(total_temporary_cost) + " 円");
    data_container.append("text").attr("y", 270).text("(" + rate_format(total_temporary_cost / total_sales * 100) + " %)").attr("fill", "darkgray");
    data_container.append("text").attr("x", -160).attr("y", 320).text("粗利益 合計:");
    data_container.append("text").attr("y", 320).text(numberFormat(total_profit) + " 円");
    data_container.append("text").attr("y", 350).text("(" + rate_format(total_profit / total_sales * 100) + " %)").attr("fill", "darkgray");
    
    
    // scale
    this.x = d3.scale.ordinal()
      .domain(['sales', 'cost'])
      .rangeBands([0, this.width], 0.5, 0.5);

    this.y = d3.scale.linear()
      .domain([0, Math.max(total_sales, total_staff_cost + total_cost + total_temporary_cost)])
      .range([this.height, 0]);

    this.color = d3.scale.category20b();
    this.color = d3.scale.ordinal()
      .range(['#3A88FE', '#006D8F', '#0042AA', '#6EC9DB', '#FF8647']);
    
    this.base_color = d3.scale.category10();
    this.base_color = d3.scale.ordinal()
      .range(['#3A88FE', '#006D8F', '#0042AA', '#6EC9DB', '#FF8647']);

    // axis

    var x_axis = d3.svg.axis()
      .scale(this.x)
      .orient("bottom");

    var y_axis = d3.svg.axis()
      .scale(this.y)
      .orient("left");

    barchart.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(" + this.margin.left + "," + (this.height + this.margin.top) + ")")
      .call(x_axis);

    barchart.append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
      .call(y_axis);


    // barchart
    var layer = barchart.selectAll(".layer")
        .data(layers)
      .enter().append("g")
        .attr("class", "layer")
        .attr("transform", "translate(" + this.margin.left + "," + (this.margin.top) + ")")
      .on("mouseover", function(d) {
        d3.select(this).transition().style("opacity", "0.8");
        self.tooltip.style("visibility", "visible");
        self.tooltip.html("<table><thead><tr><th colspan=\"2\"><strong>" + d.key + "_" + d.project.code + "</strong></th></tr></thead><tbody><tr><th>売上</th><td>" + numberFormat(d.project.sales_result) + "円</td></tr><tr><th>人件費</th><td>" + numberFormat(d.project.staff_cost_result) + "円</td></tr><tr><th>外注費</th><td>" + numberFormat(d.project.cost_result) + "円</td></tr><tr><th>材料費</th><td>" + numberFormat(d.project.temporary_cost_result) + "円</td></tr><tr><th>粗利益</th><td>" + numberFormat(d.project.profit_result) + "円</td></tr><tr><th>粗利率</th><td>" + d.project.profit_rate_result +"%</td></tr></tbody></table>" );
      })
      .on("mousemove", function(d) {
        self.tooltip.style("top", (d3.event.pageY - 10) + "px")
          .style("left",(d3.event.pageX + 10) + "px");
      })
      .on("mouseout", function(d) {
        d3.select(this).transition().style("opacity", "1");
        self.tooltip.style("visibility", "hidden");
        
      })
    
    var y_shift = {
      sales: 0,
      staff_cost: 0,
      cost: total_staff_cost,
      temporary_cost: total_staff_cost + total_cost,
      profit: total_staff_cost + total_cost + total_temporary_cost
    }

    var rect = layer.selectAll("rect")
        .data(function(d) { return d.values })
      .enter().append("rect")
        .attr("x", function(d, i) { return self.x(d.x == 'sales' ? 'sales' : 'cost'); })
        .attr("y", function(d) { return self.y(d.y0) -  (self.y(0) - self.y(y_shift[d.x])); })
        .attr("width", this.x.rangeBand())
        .style("fill", function(d,i) { return self.base_color(i); })
        .attr("height", 0)
        .transition()
        .duration(500)
        .attr("y", function(d) { return self.y(d.y0) - (self.y(0) - self.y(d.y)) - (self.y(0) - self.y(y_shift[d.x])); })
        .attr("height", function(d) { return self.y(0) - self.y(d.y) ; })
        
    
    
  
  }
  
  if(this.table) {
  
    var table = this.table.select("table.projects");

    /*
    table.selectAll("thead tr").remove();
  */

    var head_row = table.select("thead").append("tr");
    head_row.append("th").text("TAG");
    head_row.append("th").text("PJコード / タイトル");
  
    head_row.append("th").text("開始");
    head_row.append("th").text("終了");
    head_row.append("th").text("売上");
    head_row.append("th").text("人件費");
    head_row.append("th").text("外注費");
    head_row.append("th").text("材料費");
    head_row.append("th").text("粗利益");
    head_row.append("th").text("完了");
  
    table.selectAll("tbody tr").remove();
    
    this.data.sort(function(a,b) {
      return a.tag.localeCompare(b.tag);
    });
    
    
    var tr = table.select("tbody")
      .selectAll("tr")
      .data(this.data)
      .enter()
      .append("tr");

    tr.each(function(d) {
    
      var tr = d3.select(this);
      tr.classed("finished", d.finished)
      tr.classed("p_project", d.tag.charAt(0) == 'P')
      tr.append("th").text(d.tag)
      tr.append("th").html(d.code + "<br><span style=\"font-weight: normal\">" + d.title + "</span>") 

      tr.append("td").text(d.start_date)
      tr.append("td").text(d.finish_date)
      tr.append("td").classed("amount", true).text(amount_format(d.sales_result))
      tr.append("td").classed("amount", true).text(amount_format(d.staff_cost_result))
      tr.append("td").classed("amount", true).text(amount_format(d.cost_result))
      tr.append("td").classed("amount", true).text(amount_format(d.temporary_cost_result))
      tr.append("td").classed("amount", true).text(amount_format(d.sales_result - (d.staff_cost_result + d.temporary_cost_result + d.cost_result)))
      tr.append("td").classed("amount", true).text(d.finished ? 'finished' : "")

    });

    var target_data = this.data.filter(function(d) { return d.finished && d.tag.charAt(0) == 'P'})
    var total = {};
    total.sales_result = d3.sum(target_data, function(d) { return d.sales_result });
    total.staff_cost_result = d3.sum(target_data, function(d) { return d.staff_cost_result });
    total.temporary_cost_result = d3.sum(target_data, function(d) { return d.temporary_cost_result });
    total.cost_result = d3.sum(target_data, function(d) { return d.cost_result });
    total.profit_result = d3.sum(target_data, function(d) { return d.sales_result - (d.staff_cost_result + d.temporary_cost_result + d.cost_result) });

    var foot_row = table.select("tfoot").append("tr");
    foot_row.append("th").text("合計");
    foot_row.append("th");
    foot_row.append("th");
    foot_row.append("th");
    foot_row.append("th").classed('amount', true).text(amount_format(total.sales_result));
    foot_row.append("th").classed('amount', true).text(amount_format(total.staff_cost_result));
    foot_row.append("th").classed('amount', true).text(amount_format(total.cost_result));
    foot_row.append("th").classed('amount', true).text(amount_format(total.temporary_cost_result));
    foot_row.append("th").classed('amount', true).text(amount_format(total.sales_result - (total.staff_cost_result + total.temporary_cost_result + total.cost_result)));
    foot_row.append("th");

    foot_row = table.select("tfoot").append("tr");
    foot_row.append("th").text("割合");
    foot_row.append("th");
    foot_row.append("th");
    foot_row.append("th");
    foot_row.append("th").classed('amount', true).text(rate_format(total.sales_result / total.sales_result * 100) + "%");
    foot_row.append("th").classed('amount', true).text(rate_format(total.staff_cost_result / total.sales_result * 100) + "%");
    foot_row.append("th").classed('amount', true).text(rate_format(total.cost_result / total.sales_result * 100) + "%");
    foot_row.append("th").classed('amount', true).text(rate_format(total.temporary_cost_result / total.sales_result * 100) + "%");
    foot_row.append("th").classed('amount', true).text(rate_format((total.sales_result - (total.staff_cost_result + total.temporary_cost_result + total.cost_result)) / total.sales_result * 100) + "%");
    foot_row.append("th");

  }
}

var numberFormat = function(num){
  return num.toString().replace(/([\d]+?)(?=(?:\d{3})+$)/g, function(t){ return t + ','; });
}
