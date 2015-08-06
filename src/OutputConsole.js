var React = require('react');
var Chart = require('./Chart');
var ObjectInfo = require('./ObjectInfo');
var Marked = require('marked');
var Shell = require('shell');
var Actions = require('./Actions');

var OutputConsole = React.createClass({

    getInitialState: function(){

        return {
        message: " ",
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
        TabsStore.bind('object-info-received-'+this.props.eventKey, this.objectInfoReceived);
    },

    componentWillUnmount: function(){
        TabsStore.unbind('query-started-'+this.props.eventKey, this.queryStarted);
        TabsStore.unbind('query-finished-'+this.props.eventKey, this.queryFinished);
        TabsStore.unbind('query-error-'+this.props.eventKey, this.queryError);
        TabsStore.unbind('object-info-received-'+this.props.eventKey, this.objectInfoReceived);
    },

    queryStarted: function(){
        this.setState({updatable: true});   // first make component updatable
        this.setState({                     // second change state so it's get rerendered
            message: "#Executing ...", 
            result: null,
            error: null,
            info: null,
        }); 
    },

    queryFinished: function(){
        this.setState({
            message: null,
            result: TabsStore.getResult(this.props.eventKey), 
            error: null,
            info: null,
            updatable: false,
        });
    },

    queryError: function(){
        this.setState({error: TabsStore.getError(this.props.eventKey)});
    },

    share: function(){
        Actions.share();
    },

    objectInfoReceived: function(){
        this.setState({updatable: true});   // first make component updatable
        this.setState({
            message: null,
            result: null,
            error: null,
            info: TabsStore.getObjectInfo(),
            updatable: false,
        });
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

    markdown: function(str){
        var renderer = new Marked.Renderer();
        renderer.link = function(href, title, text){
            return '<a href="#" onClick="openExternal(\''+href+'\');">'+text+'</a>'
        };
        return Marked(str, {renderer: renderer});
    },

    getHeader: function(query){
        var cut = query.replace(/^\s*---.*[\s\n]*/, ''); 
        var match = cut.match('^\s*/\\*\\*([\\s\\S]*?)\\*\\*/');
        if (match != null && match.length == 2){
            return <div className="markdown-block" dangerouslySetInnerHTML={{__html: this.markdown(match[1]) }} />;
        } else {
            return null;
        }
    },

    getFooter: function(query){
        var idx = query.lastIndexOf('/**');
        var idx0 = query.indexOf('/**');
        var check = query.replace(/^\s*---.*[\s\n]*/, ''); 
        if (check.substr(0,3) == '/**' && idx == idx0){ // a single markdown passed, already generated as a header so pass by
            return null;
        }
        var cut = query.substr(idx);
        var match = cut.match('/\\*\\*([\\s\\S]*?)\\*\\*/[\\s\\r\\n]*$');
        if (match != null && match.length == 2){
            return <div className="markdown-block" dangerouslySetInnerHTML={{__html: this.markdown(match[1]) }} />;
        } else {
            return null;
        }
    },

    render: function(){
        if (this.state.error){
            return this.renderError();
        } else if (this.state.message){
            return this.renderMessage();
        } else if (this.state.info){
            return this.renderInfo();
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
        var blocks = [];
        var duration = 0;
        for (var block_idx = 0; block_idx < this.state.result.length; block_idx++){
            duration += this.state.result[block_idx].duration;
            
            var renderer = this.getRenderer(this.state.result[block_idx].query);
            var datasets = this.state.result[block_idx].datasets.map(function(dataset, i){
                return renderer(dataset, i, self.state.result[block_idx].query);
            });

            var header = this.getHeader(this.state.result[block_idx].query);
            var footer = this.getFooter(this.state.result[block_idx].query);

            block = <div key={"block_"+block_idx}>{header}{datasets}{footer}</div>;
            blocks.push(block);
        }


        return (
            <div className="output-console">
                <div className="duration-div">
                <table className="duration-table"><tr>
                <td><span className="duration-word">Time:</span> <span className="duration-number">{duration}</span> <span className="duration-word">ms</span></td>
                <td><button type="button" className="btn btn-info" onClick={this.share}>share</button></td>
                </tr></table>
                </div>
                {blocks}
            </div>
        );
    },

    renderDataset: function(dataset, i, query){

        var dataset_idx = i; // hahaha, just I am drunk :)

        if (dataset.resultStatus == 'PGRES_COMMAND_OK'){
            return <div key={'cmdres_'+i} className="alert alert-success">{dataset.cmdStatus}</div>;
        } else if (['PGRES_FATAL_ERROR', 'PGRES_BAD_RESPONSE'].indexOf(dataset.resultStatus) > -1) {
            return <div key={'err_'+i} className="query-error alert alert-danger">{dataset.resultErrorMessage.toString()}</div>;
        } else if (dataset.resultStatus == 'PGRES_NONFATAL_ERROR') {
            return <div key={'err_'+i} className="query-error alert alert-info">{dataset.resultErrorMessage.toString()}</div>;
        }

        var fields = dataset.fields;
        var rows = dataset.data;

        if (fields.length == 0){
            return null;
        }

        if (fields){
            var out_fields = fields.map(function(field, i){
                return (<th key={'field_'+i}>{field.name}</th>);
            });
        };

        var out_rows = [];
        var omitted_count = 0;

        for (var i=0; i < rows.length; i++){
            if (i == 2000 && rows.length > 5000){
                var omitted_count = rows.length - 2000;
                var omitted_message = <span className="omitted-message">{omitted_count} rows were omitted from rendering to prevent long wating</span>;
                break;
            }

            var row = rows[i];

            var out_cols = [];
            for (var j=0; j < row.length; j++){
                var val = row[j];
                out_cols.push(
                    <td key={'col_'+i+'_'+j}>
                        {val}
                    </td>
                );
            }

            out_rows.push(
                <tr key={'row'+i}>
                    <td className="rownum" key={'rownum_'+i}>{i+1}</td>
                    {out_cols}
                </tr>
            );
        }

        if (omitted_count > 0){
            out_rows.push(
                <tr>
                    <td colSpan={fields.length+1}>{omitted_message}</td>
                </tr>
            );
        }

        if (dataset.nrecords == 1){
            rword = 'row';
        } else {
            rword = 'rows';
        }
        
        return (

            <div key={'dataset_'+dataset_idx}>
                <div className="rows-count-div">
                <span className="rows-count-bracket">(</span>
                <span className="rows-count-number">{dataset.nrecords}</span> <span className="rows-count-word">{rword}</span>
                <span className="rows-count-bracket">)</span>
                </div>

                <table  key={'dataset_'+dataset_idx} className="table-resultset table table-hover">
                <thead>
                    <tr>
                    <th className="rownum">#</th>
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

    renderInfo: function(){
        if (this.state.info.object != null){
            var id = this.state.info.object_name+'_'+this.state.info.object.columns.length;
        } else {
            var id = this.state.info.object_name;
        }
        return (
            <div className="output-console">
                <ObjectInfo key={id} info={this.state.info}/>
            </div>
        );
    }
});

module.exports = OutputConsole;
