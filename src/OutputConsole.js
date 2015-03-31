var React = require('react');

var OutputConsole = React.createClass({

    getInitialState: function(){

        return {
        message: "# Output console",
        result: null,
        error: null,
        };
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
        this.setState({
            message: "#Executing ...", 
            result: null,
            error: null,
        }); 
    },

    queryFinished: function(){
        this.setState({
            message: null,
            result: TabsStore.getResult(this.props.eventKey), 
            error: null,
        });
    },

    queryError: function(){
        this.setState({error: TabsStore.getError(this.props.eventKey)});
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
        self = this;

        var datasets = this.state.result.datasets.map(function(dataset, i){
            return self.renderDataset(dataset, i);
        });

        return (
            <div className="output-console">
                {datasets}
            </div>
        );
    },

    renderDataset: function(dataset, i){

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
                    <td key={i+'_'+j}>
                    {val}
                    </td>
                );
            });

            return (
                <tr key={'row'+i}>
                    <td>{i+1}</td>
                    {out_row_cols}
                </tr>);
        });
            
        return (

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
        );
    } 
});

module.exports = OutputConsole;
