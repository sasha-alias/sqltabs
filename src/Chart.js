/*
  Copyright (C) 2015  Aliaksandr Aliashkevich

      This program is free software: you can redistribute it and/or modify
      it under the terms of the GNU General Public License as published by
      the Free Software Foundation, either version 3 of the License, or
      (at your option) any later version.

      This program is distributed in the hope that it will be useful,
      but WITHOUT ANY WARRANTY; without even the implied warranty of
      MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
      GNU General Public License for more details.

      You should have received a copy of the GNU General Public License
      along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var React = require('react');
var ReactDOM = require('react-dom');
var c3 = require('c3');
var $ = require('jquery');

var Chart = React.createClass({

    componentDidMount: function(){

        var fields = this.props.dataset.fields.map(function(field){
            return field.name;
        });
        this.props.dataset.data.unshift(fields);

        var data = {};

        var column_charts = ['line', 'spline', 'area', 'step', 'area-spline', 'area-step'];
        var row_charts = ['bar', 'pie', 'donut'];

        if (column_charts.indexOf(this.props.type) != -1){
            // field name as a header
            var rows = this.props.dataset.data;
            rows.unshift(fields);
            data = {
                rows: rows,
                type: this.props.type,
            }

            if (this.props.x){
                data.x = fields[this.props.x+1];
            }

        } else if (row_charts.indexOf(this.props.type) != -1){
            // first column value as a header
            var columns = this.props.dataset.data;
            data = {
                columns: columns,
                type: this.props.type,
            }
        } else {
            $(ReactDOM.findDOMNode(this)).html('<div class="connection-error alert alert-danger">Chart '+this.props.type+' is not supported<div>');
            return;
        }

        c3.generate({
            bindto: ReactDOM.findDOMNode(this),
            data: data,
        });
    },

    render: function(){

        return <div></div>

    },
})

module.exports = Chart;
