
var Actions = require('../../Actions');
var React = require('react'); // eslint-disable-line no-unused-vars

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
        //var databases = info.object.databases.map(function(item, idx){
        //    var id = "database_"+tabid+"_"+idx;
        //    return <li key={id}>{item}</li>
        //});
        //var tablespaces = info.object.tablespaces.map(function(item, idx){
        //    var id = "tablespace_"+tabid+"_"+idx;
        //    return <li key={id}>{item}</li>
        //});
        //var event_triggers = info.object.event_triggers.map(function(item, idx){
        //    var id = "event_trigger_"+tabid+"_"+idx;
        //    return <li key={id}>{item}</li>
        //});

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

        var relkind;
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
            var not_null = '';
            if (info.object.columns[i].not_null == 't'){
                not_null = <span className="ace_keyword">NOT NULL</span>;
            }
            // type
            var type = <span className="ace_keyword">{info.object.columns[i].type}</span>;
            if (info.object.columns[i].max_length != '-1'){
                type = <span><span className="ace_keyword">{info.object.columns[i].type} </span>
                <span className="ace_paren ace_lparen">(</span>
                <span className="ace_constant">{info.object.columns[i].max_length}</span>
                <span className="ace_paren ace_rparen">)</span>
                </span>;
            }
            // default
            default_value = "";
            if (info.object.columns[i].default_value != null){
                var default_value = <span>
                    <span className="ace_keyword">DEFAULT </span>
                    <span className="">{info.object.columns[i].default_value}</span>
                </span>;
            }
            // description
            var descr_suffix = "";
            var description = "";
            if (info.object.columns[i].description != null){
                descr_suffix = <span className="ace_comment">--</span>;
                description = <span className="ace_comment">{info.object.columns[i].description}</span>;
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
        var pk = null;
        if (info.object.pk != null){
            pk = [];
            for (i=0; i < info.object.pk.length; i++){
                var pkd = <p key={"pk_" + info.object.pk[i].name}>
                    <span className="ace_keyword">CONSTRAINT</span> {info.object.pk[i].name}
                    <span className="ace_keyword"> </span> ({info.object.pk[i].columns})
                </p>;
                pk.push(pkd);
            }
        }


        // check constraints
        var check_constraints = null;
        if (info.object.check_constraints != null){
            check_constraints = [];
            for (i=0; i < info.object.check_constraints.length; i++){
                var check = <p key={"check_" + info.object.check_constraints[i].name}>
                    <span className="ace_keyword">CONSTRAINT</span> {info.object.check_constraints[i].name}
                    <span className="ace_keyword"> CHECK </span> ({info.object.check_constraints[i].columns})
                </p>;
                check_constraints.push(check);
            }
        }

        // indexes
        var indexes = null;
        if (info.object.indexes != null){
            indexes=[];
            for (i=0; i < info.object.indexes.length; i++){

                var idx = info.object.indexes[i];

                var unique = "";
                if (idx.non_unique == '0'){
                    unique = "UNIQUE ";
                }
                var comment = null;
                if (idx.comment){
                    comment = "-- {comment}";
                }
                var index = <p key={"idx_" + idx.name}>
                <span className="ace_keyword">{unique}INDEX </span>{idx.name}
                <span className="ace_keyword"> {idx.method} </span>({idx.columns}) {comment}
                </p>;

                indexes.push(index);
            }
        }

        // triggers
        var triggers = null;
        if (info.object.triggers != null){
            triggers = info.object.triggers.map(function(item, idx){
                var id = 'trigger_'+tabid+'+'+idx;
                return <li key={id}><a href="#" onClick={function(){getFunction('trigger:'+item.oid);}}>{item.name}</a></li>;
            });

            triggers = <div>Triggers:<ul>
                {triggers}
            </ul></div>;
        }

        var records = <p> Records: <span className="ace_constant">{info.object.records}</span></p>;
        var size = <p> Size: <span className="ace_constant">{info.object.size}</span> </p>;
        var total_size = <p> Total Size: <span className="ace_constant">{info.object.total_size}</span></p>;

        // view script
        var view_script = null;
        if (info.object.relkind == 'v'){
            this.scripts = [info.object.script];
            var div_id = "script_"+self.props.eventKey;
            view_script = <div>
                <hr/>
                Script:
                <div key={div_id} id={div_id}></div>
            </div>

            edit = <a href="#" onClick={function(){Actions.newTab(self.scripts.join(';\n---\n\n'));}}><span className="glyphicon glyphicon-edit" title="edit"/></a>;
            records = null;
            size = null;
            total_size = null;
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

