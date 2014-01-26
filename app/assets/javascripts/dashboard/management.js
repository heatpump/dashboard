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
function Management(graphSelector, tableSelector, dashboard) {

  // datasource url
  this.api = "https://docs.google.com/a/uniba.jp/spreadsheet/tq?key=0Ao5GQ0WIiwnXdG5uS0lfV0VZZWluYmJjOTQ1Y0t1NFE&gid=33";

  // select
  this.graph = undefined;
  this.table = undefined;
  this.dashboard = dashboard;
  
  if (this.dashboard) {
    this.margin = {top: 20, right: 20, bottom: 40, left: 100};
    this.width = 540 - this.margin.left - this.margin.right;
    this.height = 230 - this.margin.top - this.margin.bottom;
  } else {
    this.margin = {top: 20, right: 20, bottom: 40, left: 100};
    this.width = 1170 - this.margin.left - this.margin.right;
    this.height = 500 - this.margin.top - this.margin.bottom;
  }
  
  this.x_scale = d3.time.scale()
    .domain([new Date('2013/04/01'), new Date('2014/03/01')])
    .range([0, this.width]);
    
  this.y_scale = d3.scale.linear()
    .domain([0, 2000])
    .range([this.height, 0]);
  
  this.label_scale = d3.scale.ordinal()
    .domain(['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'])
    .range(['チャレンジ予算', '改善予算', '増床特別予算', '維持予算', '外注費', '売上高', 'チャレンジ/サーキットラボ', 'チャレンジ/社内プロジェクト', 'チャレンジ/アルスエレクトロニカ', '改善/グループ', '改善/個人', '改善/環境'])

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

    if (!this.dashboard) {

      var saleschart = this.graph.append("div").attr("class", "tab-pane").attr("id", "saleschart").append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .attr("class", "saleschart")
          .append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
      
      var improvementchart = this.graph.append("div").attr("class", "tab-pane").attr("id", "improvementchart").append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .attr("class", "improvementchart")
          .append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
      
      var challengechart = this.graph.append("div").attr("class", "tab-pane").attr("id", "challengechart").append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .attr("class", "challengechart")
          .append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
      
      var usertable = this.graph.append("div").attr("class", "tab-pane").attr("id", "user_table")
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


  query.setQuery("select A, G, E, C,K, L, M, B,  J, H, I,  D, F");
  query.send(function(response) {
    // (7) 取得したデータをリスト表示
    var datatable = response.getDataTable();
    var data = {};
    var sumdata = {};

    for (var row = 0; row < datatable.getNumberOfRows(); row++) {
      for (var col = 1, n = datatable.getNumberOfColumns(); col < n; col++) {
        
        var key = datatable.getColumnId(col);
        
        if (data[key] == undefined) {
          data[key] = {};
          sumdata[key] = {};
        }
        
        if (row > 0) {
          sumdata[key][datatable.getValue(row, 0)] = sumdata[key][datatable.getValue(row - 1, 0)] + datatable.getValue(row, col);
        } else {
          sumdata[key][datatable.getValue(row, 0)] = datatable.getValue(row, col);
        }
        data[key][datatable.getValue(row, 0)] = datatable.getValue(row, col);
      }
    
    }
    
    var sales_data = {};
    var cost_data = {};
    var improvement_data = {};
    var challenge_data = {};


    d3.keys(data).forEach(function(key) {
    
      data[key] = d3.entries(data[key]);
      sumdata[key] = d3.entries(sumdata[key]);
      data[key].forEach(function(entry) {
        entry.label = self.label_scale(key);
      })
      sumdata[key].forEach(function(entry) {
        entry.label = self.label_scale(key);
      })

      if (key == 'G') {
        sales_data[key] = data[key];
      } else if (key == 'B' || key == 'C' || key == 'D' || key == 'E' || key == 'F') {
        cost_data[key] = data[key];
      } else if (key == 'H' || key == 'I' || key == 'J') {
        challenge_data[key] = sumdata[key];
      } else if (key == 'K' || key == 'L' || key == 'M') {
        improvement_data[key] = sumdata[key];
      }

    });
    
    self.data = d3.entries(data);
    self.sales_data = d3.entries(sales_data);
    self.cost_data = d3.entries(cost_data);
    self.improvement_data = d3.entries(improvement_data);
    self.challenge_data = d3.entries(challenge_data);

    self.update();

  });
}

Management.prototype.update = function() {

  var self = this;
  var format = d3.format(".2f");
  var amount_format = d3.format("3,f");

  // 第二階層を取得
  
  var data_replace = [];

  var stack = d3.layout.stack()
    .values(function(d) {return d.value; })
    .x(function(d) {return d.key})
    .y(function(d) {return d.value});

  this.color_scale = d3.scale.ordinal()
    .domain(['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'])
    .range(['#3A88FE', '#006D8F', '#0042AA',  '#6EC9DB', '#FF8647', '#6EC9DB','#3A88FE',  '#0042AA', '#6EC9DB', '#6EC9DB', '#3C96D6','#076FDE']);

    var area = d3.svg.area()
        .x(function(d) {  return self.x_scale(d.key) + self.x_scale.rangeBand() / 2; })
        .y0(function(d) { return self.y_scale(d.y0); })
        .y1(function(d) { return self.y_scale(d.y0 + d.y); })
        .interpolate("monotone");

  

  if(this.graph) {
    /*
     * cost barchart
     */
    var layers = stack(this.cost_data);
   
    this.x_scale = d3.scale.ordinal()
      .domain(['2013/4', '2013/5', '2013/6', '2013/7', '2013/8', '2013/9', '2013/10', '2013/11', '2013/12', '2014/1', '2014/2', '2014/3'])
      .rangeRoundBands([0, this.width], .3);

    this.y_scale.domain([0, d3.max(layers, function(d) { return d3.max(d.value, function(d) { return d.y0 + d.y}) })])

    var x_axis = d3.svg.axis()
      .scale(this.x_scale)
      .orient("bottom");

    x_axis.tickFormat(function(d) { return d.substring(5)});
      
    var y_axis = d3.svg.axis()
      .scale(this.y_scale)
      .orient("left");
    
    var chart = this.graph.select("svg.barchart");
    
    chart.selectAll("g.axis").remove();
    
    chart.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate("+ this.margin.left +"," + (this.height + this.margin.top )+ ")")
      .call(x_axis);

    chart.append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
      .call(y_axis);
      
    chart.select(".y.axis")
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .attr("text-anchor", "end")
        .text("Yen");
    
    var self = this;
    chart.select("g").selectAll(".layer").remove();

    var layer = chart.select("g").selectAll(".layer")
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
        .data(function(d) { return d.value })
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

    if (!this.dashboard) {

      chart.selectAll(".legent").remove();
      var bar_legend = chart.selectAll(".legend")
          .data(this.cost_data)
        .enter().append("g")
          .attr("class", "legend")
          .attr("transform", function(d, i) { return "translate(" + (self.width - 100) + "," + ((i * 20) + 20) + ")"; });
    
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
  }


  if(this.graph && !this.dashboard) {
    /*
     * sales barchart
     */
    var layers = stack(this.sales_data);
   
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
    
    var chart = this.graph.select("svg.saleschart");
    
    chart.selectAll("g.axis").remove();
    
    chart.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate("+ this.margin.left +"," + (this.height + this.margin.top )+ ")")
      .call(x_axis);

    chart.append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
      .call(y_axis);
      
    chart.select(".y.axis")
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .attr("text-anchor", "end")
        .text("(円)");
    
    var self = this;
    chart.select("g").selectAll(".layer").remove();

    var layer = chart.select("g").selectAll(".layer")
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

    chart.selectAll(".legend").remove();
    var bar_legend = chart.selectAll(".legend")
        .data(this.sales_data)
      .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(" + (self.width - 100) + "," + ((i * 20) + 20) + ")"; });
  
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
  
  if(this.graph && !this.dashboard) {
    /*
     * improvement barchart
     */
    var layers = stack(this.improvement_data);
    this.x_scale = d3.scale.ordinal()
      .domain(['2013/4', '2013/5', '2013/6', '2013/7', '2013/8', '2013/9', '2013/10', '2013/11', '2013/12', '2014/1', '2014/2', '2014/3'])
      .rangeRoundBands([0, this.width],0.3);

    this.y_scale.domain([0, d3.max(layers, function(d) { return d3.max(d.value, function(d) { return d.y0 + d.y}) }) + 500000])

    var x_axis = d3.svg.axis()
      .scale(this.x_scale)
      .orient("bottom");
      
    var y_axis = d3.svg.axis()
      .scale(this.y_scale)
      .orient("left");
    
    var chart = this.graph.select("svg.improvementchart");
    
    chart.selectAll("g.axis").remove();
    
    chart.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate("+ this.margin.left +"," + (this.height + this.margin.top )+ ")")
      .call(x_axis);

    chart.append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
      .call(y_axis);
      
    chart.select(".y.axis")
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .attr("text-anchor", "end")
        .text("(円)");
    
    var self = this;
    chart.select("g").selectAll(".layer").remove();

    var layer = chart.select("g").selectAll(".layer")
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

        
    layer.append("path").attr("d", function(d) { return area(d.value) })
      .on("mouseover", function(d) {
        console.log(d)
        d3.select(this).transition().style("opacity", "0.8");
        self.tooltip.style("visibility", "visible");
        self.tooltip.html("<strong>" + d.value[11].label + "</strong><br />累計 " + amount_format(d.value[11].value) + "円" );
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
    */
    
    chart.selectAll(".legent").remove();
    var bar_legend = chart.selectAll(".legend")
        .data(this.improvement_data)
      .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(" + (self.width - 100) + "," + ((i * 20) + 20) + ")"; });
  
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
  
  if(this.graph && !this.dashboard) {
    /*
     * challenge barchart
     */
    var layers = stack(this.challenge_data);
   
    this.x_scale = d3.scale.ordinal()
      .domain(['2013/4', '2013/5', '2013/6', '2013/7', '2013/8', '2013/9', '2013/10', '2013/11', '2013/12', '2014/1', '2014/2', '2014/3'])
      .rangeRoundBands([0, this.width], .3);

    this.y_scale.domain([0, d3.max(layers, function(d) { return d3.max(d.value, function(d) { return d.y0 + d.y}) }) + 500000])

    var x_axis = d3.svg.axis()
      .scale(this.x_scale)
      .orient("bottom");
      
    var y_axis = d3.svg.axis()
      .scale(this.y_scale)
      .orient("left");
    
    var chart = this.graph.select("svg.challengechart");
    
    chart.selectAll("g.axis").remove();
    
    chart.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate("+ this.margin.left +"," + (this.height + this.margin.top )+ ")")
      .call(x_axis);

    chart.append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
      .call(y_axis);
      
    chart.select(".y.axis")
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .attr("text-anchor", "end")
        .text("(円)");
    
    var self = this;
    chart.select("g").selectAll(".layer").remove();

    var layer = chart.select("g").selectAll(".layer")
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

    layer.append("path").attr("d", function(d) { return area(d.value) })
      .on("mouseover", function(d) {
        console.log(d)
        d3.select(this).transition().style("opacity", "0.8");
        self.tooltip.style("visibility", "visible");
        self.tooltip.html("<strong>" + d.value[11].label + "</strong><br />累計 " + amount_format(d.value[11].value) + "円" );
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
  */
    chart.selectAll(".legent").remove();
    var bar_legend = chart.selectAll(".legend")
        .data(this.challenge_data)
      .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(" + (self.width - 100) + "," + ((i * 20) + 20) + ")"; });
  
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