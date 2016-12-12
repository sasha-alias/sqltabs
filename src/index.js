require('./build/App.js');
var $ = require('jquery');
var c3 = require('c3');

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

        var fields = dataset.fields.map(function(field, i){
            return field.name;
        });

        var data = {};

        var column_charts = ['line', 'spline', 'area', 'step', 'area-spline', 'area-step', 'bar'];
        var row_charts = ['pie', 'donut'];

        if (column_charts.indexOf(chart_type) != -1){
            // field name as a header
            var rows = dataset.data;
            rows.unshift(fields);

            data = {
                rows: rows,
                type: chart_type,
            }

            if (chart_arg_x){

                var xfield = dataset.fields[chart_arg_x-1];
                if (xfield){

                    data.x = xfield.name;

                    if (xfield.type == 'DATE'){
                        var axis = {
                            x: {
                                type: 'timeseries',
                                tick: {
                                    format: '%Y-%m-%d'
                                }
                            }
                        };
                    }

                    if (xfield.type == 'TIMESTAMPTZ'){
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

                    if (xfield.type == 'TIMESTAMP'){
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
            _div.html('<div class="connection-error alert alert-danger">Chart building error<div>');
            console.log(err);
            return;
        }
    });

}
