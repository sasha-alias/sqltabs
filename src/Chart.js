var React = require('react');
var c3 = require('c3');
var $ = require('jquery');

var Chart = React.createClass({

    componentDidMount: function(){

        var fields = this.props.dataset.fields.map(function(field, i){
            return field.name;
        });
        this.props.dataset.data.unshift(fields);

        var data = {};

        var column_charts = ['line', 'spline', 'area', 'step', 'area-spline', 'area-step'];
        var row_charts = ['bar', 'pie', 'donut'];

        if (column_charts.indexOf(this.props.type) != -1){
            // field name as a header
            console.log('col');
            var rows = this.props.dataset.data;
            rows.unshift(fields); 
            data = {
                rows: rows, 
                type: this.props.type,
            }
        } else if (row_charts.indexOf(this.props.type) != -1){
            // first column value as a header
            console.log('row');
            var columns = this.props.dataset.data;
            data = {
                columns: columns,
                type: this.props.type,
            }
        } else {
            console.log('ret');
            // TODO: render message "unsupported chart"
            $(React.findDOMNode(this)).html('<div class="connection-error alert alert-danger">Chart '+this.props.type+' is not supported<div>');
            return;
        }

        var chart = c3.generate({
            bindto: React.findDOMNode(this),
            data: data,
        });
    },

    render: function(){

        return <div></div>

    },
})

module.exports = Chart;
