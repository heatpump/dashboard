// Place all the behaviors and hooks related to the matching controller here.
// All this logic will automatically be available in application.js.
/**
 * Management class
 *
 * 設計:
 *
 * domへのattachと、data、optionの変更というinterface
 * dataが追加される / optionが変更されると、updateが呼ばれる
 * updateはdomにattachされていない状態でも失敗はしない
 * 
 * @constructor
 */
function Management(graphSelector, tableSelector) {

  // datasource url
  this.api = "https://docs.google.com/a/uniba.jp/spreadsheet/tq?key=0Ao5GQ0WIiwnXdG5uS0lfV0VZZWluYmJjOTQ1Y0t1NFE&gid=33";

  // select
  this.graph = undefined;
  this.table = undefined;
  
  this.margin = {top: 20, right: 20, bottom: 40, left: 100};
  this.width = 1170 - this.margin.left - this.margin.right;
  this.height = 500 - this.margin.top - this.margin.bottom;
  
  this.x_scale = d3.time.scale()
    .domain([new Date('2013/04/01'), new Date('2014/03/01')])
    .range([0, this.width]);
    
  this.y_scale = d3.scale.linear()
    .domain([0, 2000])
    .range([this.height, 0]);
  
  this.attachTo(graphSelector, tableSelector);
  this.load();

}

Management.prototype.attachTo = function(graphSelector, tableSelector) {
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
    
    var piechart = this.graph.append("div").attr("class", "tab-pane").attr("id", "piechart").append("svg")
          .attr("width", this.width + this.margin.left + this.margin.right)
          .attr("height", this.height + this.margin.top + this.margin.bottom)
          .attr("class", "piechart")
        .append("g")
          .attr("transform", "translate(" + (this.width + this.margin.left + this.margin.right) / 2 + "," + (this.height + this.margin.top + this.margin.bottom) / 2 + ")");
    
    var usertable = this.graph.append("div").attr("class", "tab-pane").attr("id", "user_table")
    
    var person_table = usertable.append("table").attr("class", "table table-bordered person");
    person_table.append("thead");
    person_table.append("tfoot");
    person_table.append("tbody");
    
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
    
    var data_table = this.table.append("table").attr("class", "table table-bordered datatable");
    
    data_table.append("thead");
    data_table.append("tfoot");
    data_table.append("tbody");

    
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
Management.prototype.load = function() {

  var self = this;
  var query = new google.visualization.Query(this.api);

  this.label_scale = d3.scale.ordinal()
    .domain(['B', 'C', 'D', 'E', 'F'])
    .range(['チャレンジ予算', '改善予算', '増床特別予算', '維持予算', '外注費'])


  query.setQuery("select A, E, C, B, D, F");
  query.send(function(response) {
    // (7) 取得したデータをリスト表示
    var datatable = response.getDataTable();
    var data = {};

    for (var row = 0; row < datatable.getNumberOfRows(); row++) {
      for (var col = 1, n = datatable.getNumberOfColumns(); col < n; col++) {
        if (data[datatable.getColumnId(col)] == undefined) {
          data[datatable.getColumnId(col)] = {};
        }
        data[datatable.getColumnId(col)][datatable.getValue(row, 0)] = datatable.getValue(row, col);
      }
    
    }
    
    d3.keys(data).forEach(function(key) {
      data[key] = d3.entries(data[key]);
      data[key].forEach(function(entry) {
        entry.label = self.label_scale(key);
      })
    });
    
    data = d3.entries(data);

    self.data = data;

    self.update();

  });
}

Management.prototype.update = function() {

  var self = this;
  var format = d3.format(".2f");
  var amount_format = d3.format("3,f");

  // 第二階層を取得
  
  var data_replace = [];
  
  if(this.graph) {
    /*
     * barchart
     */
    var stack = d3.layout.stack()
      .values(function(d) {return d.value; })
      .x(function(d) {return d.key})
      .y(function(d) {return d.value});

    var layers = stack(this.data);
   
    this.color_scale = d3.scale.ordinal()
      .domain(['B', 'C', 'D', 'E', 'F'])
      .range(['#3A88FE', '#006D8F', '#0042AA', '#6EC9DB', '#FF8647']);
    this.label_scale = d3.scale.ordinal()
      .domain(['B', 'C', 'D', 'E', 'F'])
      .range(['チャレンジ予算', '改善予算', '増床特別予算', '維持予算', '外注費'])
    ;
    this.x_scale = d3.scale.ordinal()
      .domain(['2013/4', '2013/5', '2013/6', '2013/7', '2013/8', '2013/9', '2013/10', '2013/11', '2013/12', '2014/1', '2014/2', '2014/3'])
      .rangeRoundBands([0, this.width], .3);

    this.y_scale.domain([0, d3.max(layers, function(d) { return d3.max(d.value, function(d) { return d.y0 + d.y}) })])

    var x_axis = d3.svg.axis()
      .scale(this.x_scale)
      .orient("bottom");
      
    var y_axis = d3.svg.axis()
      .scale(this.y_scale)
      .orient("left");
    
    this.graph.select("svg.barchart").selectAll("g.axis").remove();
    
    this.graph.select("svg.barchart").append("g")
      .attr("class", "x axis")
      .attr("transform", "translate("+ this.margin.left +"," + (this.height + this.margin.top )+ ")")
      .call(x_axis);

    this.graph.select("svg.barchart").append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
      .call(y_axis);
      
    d3.select(".y.axis")
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .attr("text-anchor", "end")
        .text("(円)");
    
    var self = this;
    this.graph.select("svg.barchart g").selectAll(".layer").remove();

    var layer = this.graph.select("svg.barchart g").selectAll(".layer")
        .data(layers)
      .enter().append("g")
        .attr("class", "layer")
        .style("fill", function(d,i) { return self.color_scale(d.key); });
/*
    var total = {};
    this.data_by_month.total.result.forEach(function(entry) {
      total[entry.key] = entry.hour;
    });
    */

    var rect = layer.selectAll("rect")
        .data(function(d) { console.log(d); return d.value })
      .enter().append("rect")
        .attr("x", function(d) { return self.x_scale(d.key); })
        .attr("y", function(d) { return self.y_scale(d.y0 + d.y); })
        .attr("width", self.x_scale.rangeBand())
        .attr("height", function(d) { return self.y_scale(d.y0) - self.y_scale(d.y0 + d.y); })
      .on("mouseover", function(d) {
        d3.select(this).transition().style("opacity", "0.8");
        self.tooltip.style("visibility", "visible");
        self.tooltip.html("<strong>" + d.key + " " + d.label + "</strong><br />" + amount_format(d.value) + "円" );
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
        .data(this.data)
      .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(" + (self.width - 100) + "," + (i * 20) + ")"; });
  
    bar_legend.append("rect")
        .attr("x", 140)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", function(d) { return self.color_scale(d.key) } );
  
    bar_legend.append("text")
        .attr("x", 130)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function(d) { return self.label_scale(d.key); });

  }
  
  if(this.table) {
  
    var thead_tr = self.table.select("table thead").selectAll("tr").data([""]).enter().append("tr");
    thead_tr.append("th").text("項目");
    thead_tr.selectAll("th.month").data(self.data[0].value).enter().append("th").attr("class", "month").text(function(d) { return d.key; });
  
    var tr = self.table.select('table tbody').selectAll("tr").data(self.data).enter().append("tr");
    tr.append("th").text(function(d) { return self.label_scale(d.key); });
    var append_td = tr.selectAll("td").data(function(d) { return d.value; }).enter();
    append_td.append("td").classed("amount", true).text(function(d) { return amount_format(d.value); });
  }
}