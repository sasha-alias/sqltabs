require('./build/App.js');
var $ = require('jquery');
var c3 = require('c3');
var d3 = require('d3');

function openExternal(url){
    var shell = require('electron').shell;
    shell.openExternal(url);
}

function scrollTo(div, to){
    return $(div).animate({scrollTop: $(to).position().top - $(div).parent().offset().top}, 300);
}

function scrollToDown(div, to){
    var scroll = $(div).scrollTop();
    var position = $(to).offset().top - $(div).offset().top;
    if (position < 0){ // id scrolled away up
        return $(div).scrollTop(position);
    }
    if (position > $(div).height()){ // if scrolled away down
        return $(div).scrollTop(position);
    }
    if (position > $(div).height() - 2*$(to).height()){
        return $(div).scrollTop(scroll + $(to).height());
    }
}

function scrollToUp(div, to){
    var scroll = $(div).scrollTop();
    var position = $(to).offset().top - $(div).offset().top;

    if (position + $(to).height() < 0){ // if scrolled away up
        return $(div).scrollTop(position);
    }
    if (position > $(div).height()){ // if scrolled away down
        return $(div).scrollTop(position);
    }
    if (position - $(to).height() < 0){
        return $(div).scrollTop(scroll - $(to).height());
    }
}

// return a pivot data for a dataset
function pivotTable(dataset){
    var column_names = [];
    var xvalues = [];
    var values = {};
    var rows = {};
    for (rn in dataset.data){ // at first run fill the existing data (rows/columns/values)
        if (rn == 0){ // skip first row as it contains column names we don't need for pivot
            continue;
        }
        var val1 = dataset.data[rn][0];
        var val2 = dataset.data[rn][1];
        if (column_names.indexOf(val2) == -1){
            column_names.push(val2);
        }
        if (xvalues.indexOf(val1) == -1){
            xvalues.push(val1);
        }
        if (!(val1 in values)){
            values[val1] = [];
        }
        values[val1][val2] = dataset.data[rn][2];
    }

    for (n in xvalues){ // at second run fill the missing values with nulls
        var val1 = xvalues[n];
        rows[val1] = [];
        for (m in column_names){
            var val2 = column_names[m];
            if (val1 in values && val2 in values[val1]){
                rows[val1].push(values[val1][val2]);
            } else {
                rows[val1].push(null);
            }
        }
    }

    var res = [];
    column_names.unshift(dataset.fields[0].name);
    res.push(column_names); // first row is pivot column names
    xvalues.forEach(function(item){
        var r = [item].concat(rows[item]);
        res.push(r);
    });

    console.log(res);

    return res;
}


function mount_charts(){

    $("input[type=hidden]").each( function(idx, item){
        var chart_id = item.id.substr(5);
        var dataset = JSON.parse(decodeURIComponent(item.value));

        var chart_div = $("div[data-chart-id='"+chart_id+"']")[0];

        var chart_type = $("div[data-chart-id='"+chart_id+"']").attr('data-chart-type');

        var chart_args = $("div[data-chart-id='"+chart_id+"']").attr('data-chart-args');

        var chart_arg_x = chart_args.match("\\s*x\\s*=\\s*([A-z0-9_]*)");
        if (chart_arg_x != null && chart_arg_x.length>0){
            chart_arg_x = chart_arg_x[1];
        }

        var pivot = chart_args.match("\\s*pivot\\s*");

        var fields = dataset.fields.map(function(field, i){
            return field.name;
        });

        var data = {};

        var column_charts = ['line', 'spline', 'area', 'step', 'area-spline', 'area-step', 'bar', 'scatter'];
        var row_charts = ['pie', 'donut', 'gauge', 'bubble'];

        if (column_charts.indexOf(chart_type) != -1){
            // field name as a header
            var rows = dataset.data;
            rows.unshift(fields);

            data = {
                rows: rows,
                type: chart_type,
            }

            if (pivot){
                data.rows = pivotTable(dataset);
                chart_arg_x = 1; // in pivot charts first column is always at axis X
            }

            if (chart_arg_x){

                var xfield = dataset.fields[chart_arg_x-1];
                if (xfield){

                    data.x = xfield.name;

                    if (['DATE', 'Date'].indexOf(xfield.type) > -1){
                        var axis = {
                            x: {
                                type: 'timeseries',
                                tick: {
                                    format: '%Y-%m-%d'
                                }
                            }
                        };
                    }

                    if (['TIMESTAMPTZ'].indexOf(xfield.type) > -1 ){
                        var axis = {
                            x: {
                                type: 'timeseries',
                                tick: {
                                    format: '%Y-%m-%d %H:%M:%S.%L%Z'
                                }
                            }
                        };
                        // transform timestamp format to the one edible by d3
                        for (var i=1; i < data.rows.length; i++){
                            data.rows[i][chart_arg_x-1] = data.rows[i][chart_arg_x-1].replace(
                            /(\.[0-9]{3})([0-9]*)(\+[0-9]{2}$)/g, '$1$300'
                            );
                        }

                        data.xFormat = '%Y-%m-%d %H:%M:%S.%L%Z';

                    }

                    if (['TIMESTAMP', 'DATETIME', 'DateTime', 'DateTime2'].indexOf(xfield.type) > -1){
                        var axis = {
                            x: {
                                type: 'timeseries',
                                tick: {
                                    format: '%Y-%m-%d %H:%M:%S.%L'
                                }
                            }
                        };
                        // transform timestamp format to the one edible by d3
                        for (var i=1; i < data.rows.length; i++){
                            data.rows[i][chart_arg_x-1] = data.rows[i][chart_arg_x-1].replace(
                            /(\.[0-9]{3})([0-9]*)$/g, '$1'
                            );
                        }

                        data.xFormat = '%Y-%m-%d %H:%M:%S.%L';
                    }
                }
            }

        } else if (row_charts.indexOf(chart_type) != -1){
            // first column value as a header
            if (chart_type == "bubble"){ // bubble chart is implemented not with c3
                return mount_bubble_chart(chart_id, dataset);
            }

            var columns = dataset.data;
            data = {
                columns: columns,
                type: chart_type,
            }
        } else {
            var _div = $("div[data-chart-id='"+chart_id+"']");
            _div.html('<div class="connection-error alert alert-danger">Chart '+chart_type+' is not supported<div>');
            return;
        }

        try {
            var chart = c3.generate({
                bindto: chart_div,
                data: data,
                axis: axis,
            });
        } catch (err){
            var _div = $("div[data-chart-id='"+chart_id+"']");
            _div.html('<div class="connection-error alert alert-danger">Chart building error: '+err+'<div>');
            console.log(err);
            return;
        }
    });

}

function mount_bubble_chart(chart_id, dataset){

    var diameter = 500, //max size of the bubbles
        color    = d3.scale.category20b(); //color category

    var bubble = d3.layout.pack()
        .sort(null)
        .size([diameter, diameter])
        .padding(1.5);

    var svg = d3.select("[data-chart-id='"+chart_id+"']")
        .append("svg:svg")
          .attr("width", "100%")
          .attr("height", 500)
          .attr("class", "bubble");

    var data = dataset.data;
    // convert list of lists to list of dicts
    data = data.map(function(d){ return {name: d[0], value: d[1]}; });

    // keep only leaf nodes
    var nodes = bubble.nodes({children:data}).filter(function(d) { return !d.children; });

    //setup the chart
    var bubbles = svg.append("g")
            .attr("transform", "translate(0,0)")
            .selectAll(".bubble")
            .data(nodes)
            .enter();

    var tooltip = d3.select("[data-chart-id='"+chart_id+"']")
        .append("div")
        .style("position", "absolute")
        .style("z-index", "10")
        .style("visibility", "hidden")
        .style("color", "white")
        .style("padding", "8px")
        .style("background-color", "rgba(0, 0, 0, 0.75)")
        .style("border-radius", "6px")
        .style("font", "12px sans-serif")
        .text("tooltip");

    //create the bubbles
    bubbles.append("circle")
        .attr("r", function(d){ return d.r; })
        .attr("cx", function(d){ return d.x; })
        .attr("cy", function(d){ return d.y; })
        .style("fill", function(d) { return color(d.value); })
        .on("mouseover", function(d) {
            tooltip.text(d.name + ": "+ d.value);
            tooltip.style("visibility", "visible");
        })
        .on("mousemove", function() {
            return tooltip.style("top", (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");
        })
        .on("mouseout", function(){return tooltip.style("visibility", "hidden");});

    //format the text for each bubble
    bubbles.append("text")
        .attr("x", function(d){ return d.x; })
        .attr("y", function(d){ return d.y + 5; })
        .attr("text-anchor", "middle")
        .text(function(d){ // display text only if it fits into the bubble (calculation is very dumb)
            var text_width = d.name.length * 12;
            if ( text_width < d.r*2 ) {
                return d.name;
            }
        })
        .style({
            "fill":"white",
            "font-family":"Helvetica Neue, Helvetica, Arial, san-serif",
            "font-size": "12px"
        });
}
