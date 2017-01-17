var React = require('react');

var Renderer = {

    info: function(tabid, info, getFunction){
        if (info.object_type == 'database'){
            return this.render_db_info(tabid, info, getFunction);
        } else if (info.object_type == 'schema'){
            return this.render_schema_info(tabid, info, getFunction);
        } else if (info.object_type == "relation"){
            return this.render_relation_info(tabid, info, getFunction);
        } else {
            return <div className="alert alert-danger"> Object "{info.object_name}" either not found or not supported yet </div>
        }
    },

    render_db_info: function(tabid, info, getFunction){

        var gotop = <a href="#" onClick={function(){scrollTo(
                    '#output-console-'+tabid, "#output-console-"+tabid
                    )}}><span className="glyphicon glyphicon-circle-arrow-up"/></a>;

        var schemas = info.object.schemas.map(function(item, idx){
            var id = "schema_"+tabid+"_"+idx;
            return <li key={id}><a href="#" onClick={function(){getFunction(item+'.');}}>{item}</a></li>
        });
        var roles = info.object.roles.map(function(item, idx){
            var id = "role_"+tabid+"_"+idx;
            return <li key={id}>{item}</li>
        });
        var databases = info.object.databases.map(function(item, idx){
            var id = "database_"+tabid+"_"+idx;
            return <li key={id}>{item}</li>
        });
        var tablespaces = info.object.tablespaces.map(function(item, idx){
            var id = "tablespace_"+tabid+"_"+idx;
            return <li key={id}>{item}</li>
        });
        var event_triggers = info.object.event_triggers.map(function(item, idx){
            var id = "event_trigger_"+tabid+"_"+idx;
            return <li key={id}>{item}</li>
        });

        return (<div className="object-info-div">Database host <span className="object-info-name">{info.object_name}</span> <br/>
            {info.object.version}


            <ul className="schema-nav nav nav-pills">
              <li role="presentation"><a href="#" onClick={function(){
                  scrollTo('#output-console-'+tabid, '#schemas-'+tabid);
              }}> Schemas ({schemas.length}) </a></li>

              <li role="presentation"><a href="#" onClick={function(){
                  scrollTo('#output-console-'+tabid, '#roles-'+tabid);
              }}> Roles ({roles.length}) </a></li>

            </ul>

            <hr/>
            <div id={"schemas-"+tabid}> {gotop} Schemas:
                <ul>
                    {schemas}
                </ul>
            </div>
            <div id={"roles-"+tabid}> {gotop} Roles:
                <ul>
                    {roles}
                </ul>
            </div>
        </div>);

    },

    render_schema_info: function(tabid, info, getFunction){

        var tables = info.object.tables.map(function(item, idx){
            var id = "table_"+tabid+"_"+idx;
            var full_object_name = info.object_name+'.'+item; // schema.table
            return <li key={id}><a href="#" onClick={function(){getFunction(full_object_name)}}>{item}</a></li>
        });

        var functions = info.object.functions.map(function(item, idx){
            var id = "function_"+tabid+"_"+idx;
            var full_object_name = info.object_name+'.'+item; // schema.function
            return <li key={id}><a href="#" onClick={function(){getFunction(full_object_name)}}>{item}</a></li>
        });

        var views = info.object.views.map(function(item, idx){
            var id = "view_"+tabid+"_"+idx;
            var full_object_name = info.object_name+'.'+item; // schema.function
            return <li key={id}><a href="#" onClick={function(){getFunction(full_object_name)}}>{item}</a></li>
        });

        var sequences = info.object.sequences.map(function(item, idx){
            var id = "sequence_"+tabid+"_"+idx;
            var full_object_name = info.object_name+'.'+item; // schema.sequence
            return <li key={id}><a href="#" onClick={function(){getFunction(full_object_name)}}>{item}</a></li>
        });

        var gotop = <a href="#" onClick={function(){scrollTo(
                    '#output-console-'+tabid, "#output-console-"+tabid
                    )}}><span className="glyphicon glyphicon-circle-arrow-up"/></a>;

        return (<div className="object-info-div">Schema <span className="object-info-name">{info.object_name} </span>
                at <a href="#" onClick={function(){getFunction()}}>{info.object.current_database}</a>

                <ul className="schema-nav nav nav-pills">
                  <li role="presentation"><a href="#" onClick={function(){
                      scrollTo('#output-console-'+tabid, '#tables-'+tabid);
                  }}> Tables ({tables.length}) </a></li>

                  <li role="presentation"><a href="#" onClick={function(){
                      scrollTo('#output-console-'+tabid, '#functions-'+tabid);
                  }}> Functions ({functions.length}) </a></li>

                  <li role="presentation"><a href="#" onClick={function(){
                      scrollTo('#output-console-'+tabid, '#views-'+tabid);
                  }}> Views ({views.length}) </a></li>

                  <li role="presentation"><a href="#" onClick={function(){
                      scrollTo('#output-console-'+tabid, '#sequences-'+tabid);
                  }}> Sequences ({sequences.length}) </a></li>
                </ul>

                <hr/>
            <div id={"tables-"+tabid}> {gotop} Tables:
                <ul>
                    {tables}
                </ul>
            </div>
            <div id={"functions-"+tabid}> {gotop} Functions:
                <ul>
                    {functions}
                </ul>
            </div>
            <div id={"views-"+tabid}> {gotop} Views:
                <ul>
                    {views}
                </ul>
            </div>
            <div id={"sequences-"+tabid}> {gotop} Sequences:
                <ul>
                    {sequences}
                </ul>
            </div>
        </div>
        );
    },

    render_relation_info: function(tabid, info, getFunction){

        if (info.object == null){
            return <div className="alert alert-danger"> Object "{info.object_name}" not found </div>
        }

        if (info.object.relkind == 'r'){relkind = "Table"}
        else if (info.object.relkind == 'i'){relkind = 'Index'}
        else if (info.object.relkind == 'S'){relkind = 'Sequence'}
        else if (info.object.relkind == 'v'){relkind = "View"}
        else if (info.object.relkind == 'm'){relkind = "Materialized View"}
        else if (info.object.relkind == 'c'){relkind = "Type"}
        else if (info.object.relkind == 't'){relkind = "TOAST Table"}
        else if (info.object.relkind == 'f'){relkind = "Foreign Table"}
        else {relkind = ""}

        var edit = null;
        columns = [];
        columns.push(
                <tr key="object_info_column_header">
                    <th>Column</th>
                    <th>Type</th>
                    <th>Not Null</th>
                    <th>Default Value</th>
                    <th>&nbsp;</th>
                    <th>Description</th>
                </tr>
        );
        for (var i=0; i<info.object.columns.length; i++){
            // not null
            if (info.object.columns[i].not_null == 't'){
                var not_null = <span className="ace_keyword">NOT NULL</span>;
            } else {
                var not_null = '';
            }
            // type
            if (info.object.columns[i].max_length != '-1'){
                var type = <span><span className="ace_keyword">{info.object.columns[i].type} </span>
                <span className="ace_paren ace_lparen">(</span>
                <span className="ace_constant">{info.object.columns[i].max_length}</span>
                <span className="ace_paren ace_rparen">)</span>
                </span>;
            } else {
                var type = <span className="ace_keyword">{info.object.columns[i].type}</span>;
            }
            // default
            if (info.object.columns[i].default_value != null){
                var default_value = <span>
                    <span className="ace_keyword">DEFAULT </span>
                    <span className="">{info.object.columns[i].default_value}</span>
                </span>;
            } else {
                var default_value = "";
            }
            // description
            if (info.object.columns[i].description != null){
                var descr_suffix = <span className="ace_comment">--</span>;
                var description = <span className="ace_comment">{info.object.columns[i].description}</span>;
            } else {
                var descr_suffix = "";
                var description = "";
            }

            var column = (<tr key={info.object_name+"_"+i}>
                <td>{info.object.columns[i].name}</td>
                <td>{type}</td>
                <td>{not_null}</td>
                <td>{default_value}</td>
                <td>{descr_suffix}</td>
                <td>{description}</td>
            </tr>);

            columns.push(column);
        }

        // pk
        if (info.object.pk != null){
            var pk_cols = info.object.pk.columns.replace(/^\{/, '');
            var pk_cols = pk_cols.replace(/\}$/, '');
            pk = <p><span className="ace_keyword">CONSTRAINT</span> {info.object.pk.pk_name}
            <span className="ace_keyword"> PRIMARY KEY</span> ({pk_cols})</p>;
        } else {
            pk = null;
        }

        // check constraints
        if (info.object.check_constraints != null){
            var check_constraints = [];
            for (var i=0; i < info.object.check_constraints.length; i++){
                var check = <p key={"check_" + info.object.check_constraints[i].name}>
                    <span className="ace_keyword">CONSTRAINT</span> {info.object.check_constraints[i].name}
                    <span className="ace_keyword"> CHECK </span> {info.object.check_constraints[i].src}
                </p>;
                check_constraints.push(check);
            }
        } else {
            var check_constraints = null;
        }

        // indexes
        if (info.object.indexes != null){
            var indexes=[];
            for (var i=0; i < info.object.indexes.length; i++){

                var idx = info.object.indexes[i];
                var idx_cols = idx.columns.replace(/^\{/, '');
                var idx_cols = idx_cols.replace(/\}$/, '');

                if (idx.unique == 't'){
                    var unique = "UNIQUE ";
                } else {
                    var unique = "";
                }
                if (idx.predicate){
                    var predicate = <span><span className="ace_keyword">WHERE </span>{idx.predicate}</span>
                } else {
                    var predicate = null;
                }
                var index = <p key={"idx_" + idx.name}>
                <span className="ace_keyword">{unique}INDEX </span>{idx.name}
                <span className="ace_keyword"> {idx.method} </span>({idx_cols}) {predicate}
                </p>

                indexes.push(index);
            }

        } else {
            var indexes = null;
        }

        // triggers
        if (info.object.triggers != null){
            var triggers = info.object.triggers.map(function(item, idx){
                var id = 'trigger_'+tabid+'+'+idx;
                return <li key={id}><a href="#" onClick={function(){getFunction('trigger:'+item.oid);}}>{item.trigger_name}</a></li>;
            });

            triggers = <div>Triggers:<ul>
                {triggers}
            </ul></div>;

        } else {
            var triggers = null;
        }

        var records = <p> Records: <span className="ace_constant">{info.object.records}</span></p>;
        var size = <p> Size: <span className="ace_constant">{info.object.size}</span> </p>;
        var total_size = <p> Total Size: <span className="ace_constant">{info.object.total_size}</span></p>;

        // view script
        if (info.object.relkind == 'v'){
            this.scripts = [info.object.script];
            var div_id = "script_"+self.props.eventKey;
            var view_script = <div>
                <hr/>
                Script:
                <div key={div_id} id={div_id}></div>
            </div>

            edit = <a href="#" onClick={function(){Actions.newTab(self.scripts.join(';\n---\n\n'));}}><span className="glyphicon glyphicon-edit" title="edit"/></a>;
            records = null;
            size = null;
            total_size = null;

        } else {
            var view_script = null;
        }

        // sequence params
        if (info.object.relkind == 'S'){
            // rewrite columns on sequens params

            var columns = <tbody>
                <tr><td> Last Value:    </td><td> {info.object.params.last_value}   </td></tr>
                <tr><td> Start Value:   </td><td> {info.object.params.start_value}  </td></tr>
                <tr><td> Increment By:  </td><td> {info.object.params.increment_by} </td></tr>
                <tr><td> Max Value:     </td><td> {info.object.params.max_value}    </td></tr>
                <tr><td> Min Value:     </td><td> {info.object.params.min_value}    </td></tr>
                <tr><td> Cache Value:   </td><td> {info.object.params.cache_value}  </td></tr>
                <tr><td> Cycled:        </td><td> {info.object.params.is_cycled}    </td></tr>
                <tr><td> Called:        </td><td> {info.object.params.is_called}    </td></tr>
                </tbody>;

            records = null;
            size = null;
            total_size = null;
        }

        return (
        <div className="object-info-div">
            <p>
            <div>{relkind}&nbsp;
            <span className="object-info-name">
                <a href="#" onClick={function(){getFunction(info.object.schema+'.');}}>{info.object.schema}</a>.{info.object.relname}
                &nbsp; {edit}
            </span>
            <hr/>
            </div>
            <table className="object-info-columns-table table-hover">
                {columns}
            </table>
            </p>
            {pk}
            {indexes}
            {check_constraints}
            {triggers}
            {records}
            {size}
            {total_size}
            {view_script}
        </div>
        );
    },
}

module.exports = Renderer;

