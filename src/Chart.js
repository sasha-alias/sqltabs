var React = require('react');
var c3 = require('c3');

var Chart = React.createClass({

    componentDidMount: function(){

        var fields = this.props.dataset.fields.map(function(field, i){
            return field.name;
        });

        this.props.dataset.data.unshift(fields);

        var chart = c3.generate({
            bindto: React.findDOMNode(this),
            data: {
              rows: this.props.dataset.data,
              type: this.props.type,
            },
        });
    },

    render: function(){

        return <div></div>

    },
})

module.exports = Chart;
