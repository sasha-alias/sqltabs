function isElectron(){
    if (typeof(window) != "undefined"){
        return (window && window.process && window.process.type);
    } else {
        return true; // this means actually NodeJS context, but behaviour should be similar as for electron so `true`
    }
}

if (isElectron()){
    var React = require('react');
    var ReactDOM = require('react-dom');
    var marked = require('marked');
    var $ = require('jquery');
    var d3 = require("d3");
    var c3 = require("c3");
    var CryptoJS = require("crypto-js");
    var PGPlan = require("./pgplan").PGPlan;
    var PGPlanNodes = require("./pgplan").PGPlanNodes;
    var DataTypes = require("./datatypes");
}


function openExternal(url){
    if (isElectron()){
        var shell = require('electron').shell;
        shell.openExternal(url);
    } else {
        window.open(url);
    }
}
if (typeof(document) != "undefined"){
    document.openExternal = openExternal;
}

var formatValue = function(value){
    // escape html tags
    value = value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    // replace non-printed characters with their hex codes
    var non_printed_chars = [1,2,3,4,5,6,7,8,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31];

    if (non_printed_chars.some(function(c){ return value.indexOf(String.fromCharCode(c)) >= 0; })) { // if at least one non printed character found

        non_printed_chars.forEach(function(c){
            var c_hex = '<span class="non-printed-char">\\x'+c.toString(16).toUpperCase()+'</span>';
            var c_str = String.fromCharCode(c);
            value = value.replace(c_str, c_hex);
        });
    }

    // make links from URLs
    if (value.indexOf('http://') == 0 || value.indexOf('https://') == 0){
        value = '<a href="#" onClick="openExternal(\''+value+'\')">'+value+'</a>';
    }
    return value;
}

var SqlDoc = React.createClass({

    getInitialState: function(){
        this.floating_dsid = null;
        this.tables_headers = {};
        this.lastkeys = [0, 0]; // monitor for CMD+A for selection

        // detect if document is encrypted
        var encrypted = false;
        this.props.data.forEach( function(item) {
            if (item.encrypted){
                encrypted = true;
            }
        } );

        return {
            data: this.props.data,
            show_datatypes: false,
            encrypted,
            error: null,
        };
    },

    componentDidMount: function(){
        var dom_node = ReactDOM.findDOMNode(this)
        dom_node.addEventListener('scroll', this.scrollHandler);
        window.addEventListener('keydown', this.keyHandler);
        window.addEventListener('keyup', this.keyUpHandler);

        this.mount_charts();
    },

    componentDidUpdate: function(){
        this.mount_charts();
    },

    componentWillUnmount: function(){
        ReactDOM.findDOMNode(this).removeEventListener('scroll', this.scrollHandler);
        window.removeEventListener('keydown', this.keyHandler);
        window.removeEventListener('keyup', this.keyUpHandler);
    },

    getRenderer: function(query){
        if (this.props.output == 'script'){
            return this.renderTable;
        } else {
            if (query.match(/^\s*---\s+chart\s*.*/) != null){
                return this.renderChart;
            } else if (query.match(/^\s*---\s+csv\s*.*/) != null){
                return this.renderCsv;
            } else if (query.match(/^\s*---\s+hidden\s*.*/) != null){
                return this.renderHidden;
            } else if (query.match(/^\s*---\s+crosstable\s*.*/) != null){
                return this.renderCrossTable;
            } else {
                return this.renderTable;
            }
        }
    },

    markdown: function(str){
        var renderer = new marked.Renderer();
        renderer.link = function(href, title, text){
            return '<a href="#" onClick="openExternal(\''+href+'\');">'+text+'</a>'
        };
        return marked(str, {renderer: renderer});
    },

    getHeader: function(query){
        var cut = query.replace(/^\s*---.*[\s\n]*/, '');
        var match = cut.match('^[\\s]*/\\*\\*([\\s\\S]*?)\\*\\*/');
        if (match != null && match.length == 2){
            return <div className="markdown-block" dangerouslySetInnerHTML={{__html: this.markdown(match[1]) }} />
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

    getBlockQuery: function(query){
        if (typeof(this.props.showQuery) == 'undefined' || this.props.showQuery == false){
            return null;
        }
        return <div className="query-block"><pre>{query}</pre></div>;
    },

    sortDataset: function(block_idx, dataset_idx, column_idx){
        var dataset = this.state.data[block_idx].datasets[dataset_idx];
        var field_type = dataset.fields[column_idx].type;

        function compareAsc(a, b) {
            var aval;
            var bval;
            if (DataTypes.isNumeric(field_type)){
                aval = Number(a[column_idx]);
                bval = Number(b[column_idx]);
            } else {
                aval = a[column_idx];
                bval = b[column_idx];
            }
            if (aval < bval) return -1;
            if (aval > bval) return 1;
            return 0;
        }

        function compareDesc(a, b) {
            var aval;
            var bval;
            if (DataTypes.isNumeric(field_type)){
                aval = Number(a[column_idx]);
                bval = Number(b[column_idx]);
            } else {
                aval = a[column_idx];
                bval = b[column_idx];
            }
            if (aval < bval) return 1;
            if (aval > bval) return -1;
            return 0;
        }


        // cleanup sort order of other columns
        dataset.fields.forEach(function(field, idx){
            if (idx != column_idx){ field.sort=null; }
        });

        var compare;
        if (dataset.fields[column_idx].sort == "asc"){
            dataset.fields[column_idx].sort = "desc";
            compare = compareDesc;
        } else {
            dataset.fields[column_idx].sort = "asc";
            compare = compareAsc;
        }

        dataset.data = dataset.data.sort(compare);
        var data = this.state.data;
        data[block_idx].datasets[dataset_idx] = dataset;

        this.setState({data: data});
    },

    decryptDocument: function(){
        var encryptionKey = this.encryptionKeyField.value;

        try {
            this.state.data.forEach( function(item){
                // decrypt datasets
                var bytes = CryptoJS.AES.decrypt(item.datasets, encryptionKey);
                var decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
                item.datasets = decryptedData;

                // decrypt queries
                bytes = CryptoJS.AES.decrypt(item.query, encryptionKey);
                decryptedData = bytes.toString(CryptoJS.enc.Utf8);
                item.query = decryptedData;
                //
            });
            this.setState({encrypted: false});
        } catch (e){
            this.setState({error: "Failed to decrypt document"});
        }
    },

    renderEncryptionDialog: function(){
        return <div>
            The document is encrypted. Please enter the encryption key to view it:
            <input ref={ function(item){ this.encryptionKeyField = ReactDOM.findDOMNode(item); }.bind(this) }
                className="encryption-key-input"
                type="text"
                onKeyPress = { function(e){ if (e.key === 'Enter'){ this.decryptDocument() } }.bind(this) }
            />
            <button onClick={ this.decryptDocument }> Decrypt </button>
        </div>
    },

    render: function(){

        if (this.state.error){
            return (
                <div className="error alert alert-danger">
                    { this.state.error }
                </div>
            );
        }

        if (this.state.encrypted){
            return this.renderEncryptionDialog()
        }

        try {

            var self = this;
            var blocks = [];
            var duration = 0;
            var today = new Date();
            var current_time =
                ('0'+today.getHours()).slice(-2) + ":" +
                ('0'+today.getMinutes()).slice(-2) + ":" +
                ('0'+today.getSeconds()).slice(-2);

            // floating columns header
            var floating_cols_header = <div id={"floating-cols-header-"+this.props.eventKey} className="floating-cols-header"></div>

            // document blocks
            this.rendered_records = {};
            for (var block_idx = 0; block_idx < this.state.data.length; block_idx++){

                duration += this.state.data[block_idx].duration;

                var renderer = this.getRenderer(this.state.data[block_idx].query);
                var datasets = this.state.data[block_idx].datasets.map(function(dataset, i){
                    var dsid = self.dsid(block_idx, i);
                    self.rendered_records[dsid] = 0;
                    return renderer(block_idx, dataset, i, self.state.data[block_idx].query);
                });

                var header = this.getHeader(this.state.data[block_idx].query);
                var footer = this.getFooter(this.state.data[block_idx].query);
                var block_query = this.getBlockQuery(this.state.data[block_idx].query);

                var block = <div key={"block_"+block_idx}>{block_query}{header}{datasets}{footer}</div>;
                blocks.push(block);
            }

            // button bar
            var buttonBar = null;
            if (this.props.buttonBar == true){
                buttonBar = <div className="duration-div">
                    <div>
                        <span className="duration-word">Time:</span> <span className="duration-number">{duration}</span> <span className="duration-word">ms</span>
                    </div>
                    <div>
                        <span className="render-time"> {current_time} </span>
                    </div>
                    <div><button type="button" className="btn btn-info" onClick={this.props.onShare}>share</button></div>
                </div>;
            }


            return (
                <div className="output-console">
                    {floating_cols_header}
                    {buttonBar}
                    {blocks}
                </div>
            );

        } catch (err){
            return (

                <div className="error alert alert-danger">
                    SQLTABS ERROR. Please report the issue at <b>https://github.com/sasha-alias/sqltabs/issues</b> :<br/>
                    <pre>
                    {err.stack}
                    </pre>
                </div>
            );
        }
    },

    dsid: function(block_idx, dataset_idx){
        return this.props.eventKey+"_"+block_idx+"_"+dataset_idx;
    },

    renderChart: function(block_idx, dataset, dataset_idx, query){
        var dsid = this.dsid(block_idx, dataset_idx);

        if (['PGRES_FATAL_ERROR', 'PGRES_BAD_RESPONSE'].indexOf(dataset.resultStatus) > -1) {
            return <div key={'err_'+dataset_idx} className="query-error alert alert-danger">{dataset.resultErrorMessage.toString()}</div>;
        }

        var chart_type = query.match('^\\s*---\\s+chart\\s+([a-z\\-]*)\\s');
        if (chart_type != null && chart_type.length > 0){
            chart_type = chart_type[1];
        } else {
            chart_type = 'line';
        }
        var chart_args = query.match('^\\s*---\\s+chart\\s+[a-z\\-]*\\s*(.*)\\n');
        if (chart_args != null && chart_args.length > 0){
            chart_args = chart_args[1];
        } else {
            chart_args = '';
        }

        var chart_id = 'chart_'+dsid;

        var hidden_value = '<input id="data_'+chart_id+'" type="hidden" value="'+encodeURIComponent(JSON.stringify(dataset))+'"></input>';

        return(

            <div
                data-chart-id={chart_id}
                data-chart-type={chart_type}
                data-chart-args={chart_args}
                dangerouslySetInnerHTML={{__html: hidden_value}} />

        );
    },

    limit_ref: function(dsid){
        return "limit_"+dsid;
    },

    limit_item: function(dsid){
        return $("#"+this.limit_ref(dsid));
    },

    renderStaticRecord: function(block_idx, dataset_idx, record_idx, hlr_column, rownum_column){
        // generating text html is much faster than using react

        var dataset = this.state.data[block_idx].datasets[dataset_idx];
        var fields = rownum_column == true ? '<td class="record-rownum">'+(record_idx+1)+'</td>' : '';
        var row = dataset.data[record_idx];
        for (var column_idx=0; column_idx < row.length; column_idx++){
            if (column_idx == hlr_column-1){ // skip rendering record highligting column
                continue;
            } else {
                var val = row[column_idx];
                if (val != null){
                    val = formatValue(val);
                }
                var field_type = dataset.fields[column_idx].type;

                if (DataTypes.isNumeric(field_type)){
                    fields += '<td class="record-numeric-cell">'+val+'</td>';
                } else if (DataTypes.isJSON(field_type)){
                    let json_view = '<pre class="record-json-value">'+JSON.stringify(JSON.parse(val), null, 2)+'</pre>'
                    fields += '<td>'+json_view+'</td>';
                } else {
                    fields += '<td>'+val+'</td>';
                }
            }
        }

        var tr_class = 'record-no-hl';
        if (hlr_column != null && row.length >= hlr_column){
            var hlr_value = row[hlr_column-1];
            if (hlr_value == -1){
                tr_class = "record-negative-hl";
            } else if (hlr_value == 0){
                tr_class = "record-neutral-hl";
            } else if (hlr_value == 1){
                tr_class = "record-positive-hl";
            } else {
                tr_class = "record-no-hl";
            }
        }

        return '<tr class="'+tr_class+'">'+fields+'</tr>';
    },

    getRecordHighlightingColumn: function(block_idx){
        // record highlighting column is the `hlr=N` parameter defining the column number which is responsible for record highlighting

        var query = this.state.data[block_idx].query;

        var hlr_column = query.match("\\s*hlr\\s*=\\s*([0-9]*)");

        var highlightingColumn = null;
        if (hlr_column != null && hlr_column.length > 0){
            highlightingColumn = hlr_column[1];
        }
        return highlightingColumn;
    },

    shouldRenderRowNumColumn: function(block_idx){
        // `rownum=false` parameter defining if the first, left-most ordinal numbered column will be rendered
        // the default is to render the numbered column
        var query = this.state.data[block_idx].query;

        var rownum_column = query.match("\\s*rownum\\s*=\\s*(true|false)");
        if(rownum_column == null) {
            return true;
        }
        return rownum_column[1] == "false" ? false : true;
    },

    renderTable: function(block_idx, dataset, dataset_idx, query){ // eslint-disable-line no-unused-vars
        var self = this;

        var connector_type = this.state.data[block_idx].connector_type;
        var is_explain = this.state.data[block_idx].datasets[dataset_idx].explain;
        if (connector_type == "postgres" && is_explain){
            var pgplan_nodes = PGPlanNodes(dataset.data.slice());
            if (pgplan_nodes[0].cost != null){ // if pgplan detected properly it has cost, so render it, otherwise fallback to default renderer
                return <PGPlan nodes={pgplan_nodes}/>;
            }
        }

        var dsid = this.dsid(block_idx, dataset_idx);

	var errorInfo = dataset.resultErrorMessage && dataset.resultErrorMessage.toString();

        if (dataset.resultError) {
          const err = dataset.resultError;
          errorInfo = (
            <div>
              <div>
                <strong>{err.severity}</strong>: {err.code} - {err.message}
              </div>
              {err.where && <pre>{err.where}</pre>}
              {err.hint && (
                <div>
                  <br />
                  {err.hint}
                </div>
              )}
            </div>
         );
        }


        if (dataset.resultStatus == 'PGRES_COMMAND_OK'){
            return <div key={'cmdres_'+dsid} className="alert alert-success">{dataset.cmdStatus}</div>;
        } else if (['PGRES_FATAL_ERROR', 'PGRES_BAD_RESPONSE'].indexOf(dataset.resultStatus) > -1) {
            return <div key={'err_'+dsid} className="query-error alert alert-danger">{errorInfo}</div>;
        } else if (dataset.resultStatus == 'PGRES_NONFATAL_ERROR') {
            return <div key={'err_'+dsid} className="query-error alert alert-info">{errorInfo}</div>;
        }

        // record highliting column option
        var hlr_column = this.getRecordHighlightingColumn(block_idx);
        var rownum_column = this.shouldRenderRowNumColumn(block_idx);

        var fields = dataset.fields;
        var rows = dataset.data;

        if (fields.length == 0){
            return null;
        }

        // columns headers
        if (fields){
            var out_fields = fields.map(function(field, i){
                if (i != hlr_column-1){ // skip record highlighting column

                    var sortFunction = function(){
                        self.sortDataset(block_idx, dataset_idx, i);
                    };

                    var sort_style = "table-column-sorted-none";
                    if (field.sort == "asc"){
                        sort_style = "table-column-sorted-asc";
                    } else if (field.sort == "desc"){
                        sort_style = "table-column-sorted-desc";
                    }

                    var datatype = null;
                    if (self.state.show_datatypes){
                        datatype = <span className="table-column-header-datatype"><br/>{field.type}</span>
                    }

                    return (<th  key={'field_'+i}>
                        <span className={"table-column-header "+sort_style} onClick={sortFunction}> {field.name} {datatype}</span>
                    </th>);
                }
            });

            if(rownum_column){
                // render the rownum column?
                out_fields.unshift(<th className="table-column-header" onClick={function(){
                        self.setState({show_datatypes: !self.state.show_datatypes});
                    }}>#</th>);
            }

            var floating_fields = fields.map(function(field, i){
                if (i != hlr_column-1){ // skip record highlighting column
                    return (<div className="floating-field" key={'field_'+i}>{field.name}</div>);
                }
            });

            if(rownum_column){
                // should render the rownum column?
                floating_fields.unshift(<div className="floating-field">#</div>);
            }
            this.tables_headers[dsid] = floating_fields;
        }

        var out_rows = "";
        var omitted_count = 0;

        var limit = rows.length; // render all
        if (this.props.buttonBar){
            limit = Math.min(100, rows.length-this.rendered_records[dsid]); // render only 1st 100 records, the rest render on scroll
        }

        for (var i=this.rendered_records[dsid]; i <= limit; i++){

            if (i == limit){
                if (i<rows.length){
                    omitted_count = rows.length - this.rendered_records[dsid] + 1;
                    var omitted_message = '<span id="'+this.limit_ref(dsid)+'" class="omitted-message">'+omitted_count+' more </span>';
                }
                break;
            }

            var row = this.renderStaticRecord(block_idx, dataset_idx, i, hlr_column, rownum_column);
            this.rendered_records[dsid] = this.rendered_records[dsid] + 1;

            out_rows += row;
        }

        if (omitted_count > 0){
            out_rows += '<tr><td colSpan="'+fields.length+1+'">'+omitted_message+'</td></tr>';
        }

        var rword = 'rows';
        if (dataset.nrecords == 1){
            rword = 'row';
        }

        return (

            <div key={'dataset_'+dsid}>
                <div className="rows-count-div">
                <span className="rows-count-bracket">(</span>
                <span className="rows-count-number">{dataset.nrecords}</span> <span className="rows-count-word">{rword}</span>
                <span className="rows-count-bracket">)</span>
                </div>

                <table id ={'dataset_'+dsid} className="table-resultset table table-hover">
                <thead>
                    <tr id={"theader_"+dsid}>
                    {out_fields}
                    </tr>
                </thead>
                <tfoot>
                    <tr id={"tfooter_"+dsid}><td></td></tr>
                </tfoot>
                <tbody dangerouslySetInnerHTML={{__html: out_rows}}>
                </tbody>
                </table>
            </div>
        );
    },

    renderCrossTable: function(block_idx, dataset, dataset_idx, query){ // eslint-disable-line no-unused-vars
        var data = dataset.data;
        var header = [];
        var sidebar = [];
        var values = {};
        var rows = {};

        const detectAllPairs = () => {
            for (var rn in data){ // detect all pairs

                var val1 = data[rn][0];
                var val2 = data[rn][1];

                if (header.indexOf(val2) == -1){
                    header.push(val2);
                }

                if (sidebar.indexOf(val1) == -1){
                    sidebar.push(val1);
                }

                if (!(val1 in values)){
                    values[val1] = {};
                }
                values[val1][val2] = data[rn][2];
            }
        }
        detectAllPairs();

        const fillMissingPairs = () => {
            for (var n in sidebar){ // fill missing pairs with nulls
                var val1 = sidebar[n];
                rows[val1] = {};
                for (var m in header){
                    var val2 = header[m];
                    if (val1 in values && val2 in values[val1]){
                        rows[val1][val2] = values[val1][val2]
                    } else {
                        rows[val1][val2] = null;
                    }
                }
            }
        }
        fillMissingPairs();

        var header_html = [<td></td>];
        header.forEach(function(item){
            header_html.push(<th>{item}</th>);
        });
        header_html = <tr>{header_html}</tr>;
        var rows_html = [];
        sidebar.forEach(function(item){
            var row = [];
            row.push(<th>{item}</th>);
            for (var i in rows[item]){
                row.push(
                    <td>{rows[item][i]}</td>
                );
            }
            rows_html.push(<tr>{row}</tr>);
        });

        return (
            <table  className="table-resultset table table-bordered">
                {header_html}
                {rows_html}
            </table>

        );
    },

    renderCsv: function(block_idx, dataset, dataset_idx, query){ // eslint-disable-line no-unused-vars
        var dsid = this.dsid(block_idx, dataset_idx);

        var out_fields = [];
        if (dataset.fields){
            out_fields = dataset.fields.map(function(field, i){
                var ret = [];
                ret.push(<span className="csv-field" key={"field_"+dsid+"_"+i}>{'"'+field.name+'"'}</span>);
                if (i < dataset.fields.length-1){
                    ret.push(<span className="csv-separator">,</span>);
                }
                return ret;
            });
        }
        out_fields.push(<br/>);

        var csv = "";

        for (var i=0; i<dataset.data.length; i++){
            var row = "";
            for (var j=0; j<dataset.data[i].length; j++){
                var val = dataset.data[i][j];
                if (val == null){
                    row += '<span class="csv-value">NULL</span>';
                } else {
                    row += '<span class="csv-value">"' + val.replace('"', '""') + '"</span>';
                }
                if (j != dataset.data[i].length-1){
                    row += '<span class="csv-separator">,</span>';
                }
            }
            row += "<br/>";
            csv += row;
        }

        var rword = 'rows';
        if (dataset.nrecords == 1){
            rword = 'row';
        }

        return (
        <div key={'dataset_'+dsid}>
            <div className="rows-count-div">
            <span className="rows-count-bracket">(</span>
            <span className="rows-count-number">{dataset.nrecords}</span> <span className="rows-count-word">{rword}</span>
            <span className="rows-count-bracket">)</span>
            </div>
            <div className="csv-fields-div">
            {out_fields}
            </div>
            <div className="csv-div" dangerouslySetInnerHTML={{__html: csv}}></div>
        </div>);
    },

    renderHidden: function(block_idx, dataset, dataset_idx, query){ // eslint-disable-line no-unused-vars
        return null;
    },

    selectAll: function(){ // select content of entire output
        var node = ReactDOM.findDOMNode(this);
        var range = document.createRange();
        range.selectNodeContents(node);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    },

    keyHandler: function(e){ // follow the pressed keys and trigger selectAll when ctrl+a or cmd+a pressed
        this.lastkeys[0] = this.lastkeys[1];
        this.lastkeys[1] = e.keyCode;
        if (
            this.lastkeys[0] == 91 && this.lastkeys[1] == 65 || // left cmd + a
            this.lastkeys[0] == 93 && this.lastkeys[1] == 65 || // right cmd + a
            this.lastkeys[0] == 17 && this.lastkeys[1] == 65    // ctrl + a
        ){
            this.selectAll();
            e.stopPropagation();
            e.preventDefault();
        }
    },

    keyUpHandler: function(e){ // reset lastkeys if the cmd or ctrl key was released
        if (e.keyCode == 91 || e.keyCode == 17){
            this.lastkeys = [0, 0];
        }
    },

    scrollHandler: function(e){ // eslint-disable-line no-unused-vars
        var container = $(ReactDOM.findDOMNode(this));
        for (var block_idx=0; block_idx < this.state.data.length; block_idx++){
            for (var dataset_idx=0; dataset_idx < this.state.data[block_idx].datasets.length; dataset_idx++){

                var dsid = this.dsid(block_idx, dataset_idx);


                // hide/show floating header
                var theader = $("#theader_"+dsid);
                var tfooter = $("#tfooter_"+dsid);
                if (typeof(theader.offset()) == 'undefined'){ // skip nontable blocks
                    continue;
                }
                var theader_offset = theader.offset().top - container.offset().top + theader.height();
                var tfooter_offset = tfooter.offset().top - container.offset().top;

                if (theader_offset < 0 && tfooter_offset > 0){
                    this.floating_dsid = dsid;
                    this.showFloatingHeader(dsid, theader.offset().left);
                } else {
                    if (dsid == this.floating_dsid){
                        this.hideFloatingHeader(dsid);
                    }
                }

                // render more records if needed
                var rendered = this.rendered_records[dsid];
                var len = this.state.data[block_idx].datasets[dataset_idx].data.length;
                if (rendered == len){
                    continue;
                }

                var limit_item = this.limit_item(dsid);

                if (typeof(limit_item) != 'undefined' && typeof(container) != 'undefined'){

                    var offset = limit_item.offset().top - container.offset().top - container.height();
                    if (offset < 0){
                        this.renderNext(block_idx, dataset_idx);
                    }
                }

            }
        }
    },

    renderNext: function(block_idx, dataset_idx){
        var dsid = this.dsid(block_idx, dataset_idx);
        var rendered = this.rendered_records[dsid];
        var len = this.state.data[block_idx].datasets[dataset_idx].data.length;
        var limit = Math.min(rendered+500, len);
        var limit_item = this.limit_item(dsid);
        var hlr_column = this.getRecordHighlightingColumn(block_idx);
        var rownum_column = this.shouldRenderRowNumColumn(block_idx);

        if (rendered == len){
            return;
        }

        var insert_html = '';
        for (var i = rendered; i<limit; i++){
            this.rendered_records[dsid] = this.rendered_records[dsid] + 1;

            var row_html = this.renderStaticRecord(block_idx, dataset_idx, i, hlr_column, rownum_column);

            insert_html += row_html;
        }

        if (insert_html != ''){
            limit_item.closest('TR').before(insert_html);
        }

        if (this.rendered_records[dsid] == len){
            limit_item.remove();
        } else {
            var rest = len-this.rendered_records[dsid];
            limit_item.text(rest+' more');
        }
    },

    floatingHeader: function(){
        return $('#floating-cols-header-'+this.props.eventKey);
    },

    showFloatingHeader: function(dsid, left){
        var self = this;
        this.floatingHeader().show().offset({
            left: left
        });
        var header_cols = (<div className="floating-header-table">
            {this.tables_headers[dsid]}
            </div>);

        this.floatingHeader().html(React.renderToStaticMarkup(header_cols));

        this.floatingHeader().css({width: $('#dataset_'+dsid).width()});

        // get width of each column
        let widths = [];
        $('#dataset_'+dsid+' th').each(function(){
            widths.push($(this).outerWidth());
        });

        // set width of floating column
        $('#floating-cols-header-'+this.props.eventKey+' .floating-field').each(function(i){
            $(this).css({width: widths[i]});
        });

        $(".output-console").bind('resize', function() {
            self.showFloatingHeader(dsid, left);
        });

    },

    hideFloatingHeader: function(){
        this.floatingHeader().hide();
    },

    mount_charts: function(){

        var self = this;

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

            var stacked = chart_args.match("\\s*stacked\\s*");

            var fields = dataset.fields.map(function(field){
                return field.name;
            });

            var data = {};

            var column_charts = ['line', 'spline', 'area', 'step', 'area-spline', 'area-step', 'bar', 'scatter'];
            var row_charts = ['pie', 'donut', 'gauge', 'bubble'];

            var _div = $("div[data-chart-id='"+chart_id+"']");

            if (column_charts.indexOf(chart_type) != -1){
                // field name as a header
                var rows = dataset.data;
                rows.unshift(fields);

                var groups = [];
                if (stacked){
                    dataset.fields.forEach(function(field, i){
                        if (chart_arg_x && i == chart_arg_x - 1){
                            // skip x field from stacked group
                        } else {
                            groups.push(field.name);
                        }
                    })
                }
                data = {
                    rows: rows,
                    type: chart_type,
                    groups: [groups],
                }

                if (pivot){
                    data.rows = self.pivotTable(dataset);
                    chart_arg_x = 1; // in pivot charts first column is always at axis X
                }

                if (chart_arg_x){

                    var xfield = dataset.fields[chart_arg_x-1];
                    var axis;
                    if (xfield){

                        data.x = xfield.name;

                        if (['DATE', 'Date'].indexOf(xfield.type) > -1){
                            axis = {
                                x: {
                                    type: 'timeseries',
                                    tick: {
                                        format: '%Y-%m-%d'
                                    }
                                }
                            };
                        }

                        if (['TIMESTAMPTZ'].indexOf(xfield.type) > -1 ){
                            axis = {
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
                            axis = {
                                x: {
                                    type: 'timeseries',
                                    tick: {
                                        format: '%Y-%m-%d %H:%M:%S.%L'
                                    }
                                }
                            };
                            // transform timestamp format to the one edible by d3
                            for (i=1; i < data.rows.length; i++){
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
                    return self.mount_bubble_chart(chart_id, dataset);
                }

                var columns = dataset.data;
                data = {
                    columns: columns,
                    type: chart_type,
                }
            } else {
                _div.html('<div class="connection-error alert alert-danger">Chart '+chart_type+' is not supported<div>');
                return;
            }

            try {
                c3.generate({
                    bindto: chart_div,
                    data: data,
                    axis: axis,
                });
            } catch (err){
                _div = $("div[data-chart-id='"+chart_id+"']");
                _div.html('<div class="connection-error alert alert-danger">Chart building error: '+err+'<div>');
                return;
            }
        });

    },

    mount_bubble_chart: function(chart_id, dataset){

        if (d3.select("[data-chart-id='"+chart_id+"']").attr("mounted")){ // don't mount if already mounted
            return;
        }
        d3.select("[data-chart-id='"+chart_id+"']").attr("mounted", "true"); // mark as mounted

        var display_selected_name = d3.select("[data-chart-id='"+chart_id+"']")
            .append("div")
            .attr("class", "bubble-chart-selected-name")
            .html("&nbsp;");

        var display_selected_value = d3.select("[data-chart-id='"+chart_id+"']")
            .append("div")
            .attr("class", "bubble-chart-selected-value")
            .html("&nbsp;");

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
        data = data.map(function(d){
            return {name: d[0], value: d[1]};
        });

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
            .attr("class", "bubbles-tooltip")
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
            .on("mouseout", function(){
                return tooltip.style("visibility", "hidden");
            })
            .on("click", function(d){
                display_selected_name.text(dataset.fields[0].name + ": " + d.name);
                display_selected_value.text(dataset.fields[1].name + ": " + d.value);
            });

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
    },

    // return a pivot data for a dataset
    pivotTable: function(dataset){
        var column_names = [];
        var xvalues = [];
        var values = {};
        var rows = {};

        const fillExistingData = ()=>{
            for (var rn in dataset.data){ // at first run fill the existing data (rows/columns/values)
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
        }
        fillExistingData();

        const fillMissingData = ()=>{
            for (var n in xvalues){ // at second run fill the missing values with nulls
                var val1 = xvalues[n];
                rows[val1] = [];
                for (var m in column_names){
                    var val2 = column_names[m];
                    if (val1 in values && val2 in values[val1]){
                        rows[val1].push(values[val1][val2]);
                    } else {
                        rows[val1].push(null);
                    }
                }
            }
        }
        fillMissingData();

        var res = [];
        column_names.unshift(dataset.fields[0].name);
        res.push(column_names); // first row is pivot column names
        xvalues.forEach(function(item){
            var r = [item].concat(rows[item]);
            res.push(r);
        });

        return res;
    },



});

try {
    module.exports = SqlDoc;
} catch (e){
    console.log(e);
}
