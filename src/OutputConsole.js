var React = require('react');
var Chart = require('./Chart');

var OutputConsole = React.createClass({

    getInitialState: function(){

        return {
        message: "# Output console",
        result: null,
        error: null,
        updatable: true,
        };
    },

    shouldComponentUpdate: function(){
        // prevent component re-render after result have been rendered
        // so the resultset is rendered only once after execution
        // otherwise it will recalculate state on every action in app, which is slow on large datasets
        return this.state.updatable;
    },
    
    componentDidMount: function(){
        TabsStore.bind('query-started-'+this.props.eventKey, this.queryStarted);
        TabsStore.bind('query-finished-'+this.props.eventKey, this.queryFinished);
        TabsStore.bind('query-error-'+this.props.eventKey, this.queryError);
    },

    componentWillUnmount: function(){
        TabsStore.unbind('query-started-'+this.props.eventKey, this.queryStarted);
        TabsStore.unbind('query-finished-'+this.props.eventKey, this.queryFinished);
        TabsStore.unbind('query-error-'+this.props.eventKey, this.queryError);
    },

    queryStarted: function(){
        this.setState({updatable: true});   // first make component updatable
        this.setState({                     // second change state so it's get rerendered
            message: "#Executing ...", 
            result: null,
            error: null
        }); 
    },

    queryFinished: function(){
        this.setState({
            message: null,
            result: TabsStore.getResult(this.props.eventKey), 
            error: null,
            updatable: false,
        });
    },

    queryError: function(){
        this.setState({error: TabsStore.getError(this.props.eventKey)});
    },

    getRenderer: function(query){
        if (TabsStore.getRenderer() == 'auto'){
            if (query.match('^\\s*---\\s+chart\s*.*') != null){
                return this.renderChart;
            } else {
                return this.renderDataset;
            }
        } else {
            return this.renderDataset;
        }
    },

    render: function(){
        if (this.state.error){
            return this.renderError();
        } else if (this.state.message){
            return this.renderMessage();
        } else {
            return this.renderResult();
        }
    },

    renderError: function(){
        return (
        <div className="output-console">
            <div className="connection-error alert alert-danger">{this.state.error.toString()}</div>
        </div>
        );
    },

    renderMessage: function(){
        return (
            <div className="output-console">
            <span className="output-message">{this.state.message}</span>
            </div>
        );
    },

    renderResult: function(){
        var renderer = this.getRenderer(this.state.result.query);
        self = this;
        var datasets = this.state.result.datasets.map(function(dataset, i){
            return renderer(dataset, i, self.state.result.query);
        });

        return (
            <div className="output-console">
                <div className="duration-div">
                <span className="duration-word">Time:</span> <span className="duration-number">{this.state.result.duration}</span> <span className="duration-word">ms</span>
                </div>
                {datasets}
            </div>
        );
    },

    renderDataset: function(dataset, i, query){

        if (dataset.resultStatus == 'PGRES_COMMAND_OK'){
            return <div key={'cmdres_'+i} className="alert alert-success">{dataset.cmdStatus}</div>;
        } else if (['PGRES_FATAL_ERROR', 'PGRES_BAD_RESPONSE'].indexOf(dataset.resultStatus) > -1) {
            return <div key={'err_'+i} className="query-error alert alert-danger">{dataset.resultErrorMessage.toString()}</div>;
        }

        var fields = dataset.fields;
        var rows = dataset.data;

        if (fields){
            var out_fields = fields.map(function(field, i){
                return (<th key={'field_'+i}>{field.name}</th>);
            });
        };

        var out_rows = rows.map(function(row, i){

            var out_row_cols = row.map(function(val, j){
                return (
                    <td key={'col_'+i+'_'+j}>
                    {val}
                    </td>
                );
            });

            return (
                <tr key={'row'+i}>
                    <td key={'rownum_'+i}>{i+1}</td>
                    {out_row_cols}
                </tr>);
        });

        if (dataset.nrecords == 1){
            rword = 'row';
        } else {
            rword = 'rows';
        }

            
        return (

            <div key={'dataset_'+i}>
                <div className="rows-count-div">
                <span className="rows-count-bracket">(</span>
                <span className="rows-count-number">{dataset.nrecords}</span> <span className="rows-count-word">{rword}</span>
                <span className="rows-count-bracket">)</span>
                </div>

                <table  key={'dataset_'+i} className="table-resultset table table-hover">
                <thead>
                    <tr>
                    <th>#</th>
                    {out_fields}
                    </tr>
                </thead>
                <tbody>
                {out_rows}
                </tbody>
                </table>
            </div>
        );
    },

    renderChart: function(dataset, i, query){

        var chart_type = query.match('^\\s*---\\s+chart\\s+([a-z\\-]*)')[1];
        if (chart_type == ''){
            chart_type = 'line';
        }
        return(
            <Chart key={'dataset_'+i} dataset={dataset} type={chart_type}/>
        );
    },
});

module.exports = OutputConsole;
