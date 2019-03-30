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

var TabsStore = require('./TabsStore');
var Actions = require('./Actions');
var React = require('react');
var Ace = require('brace');
require('brace/mode/pgsql');
require('brace/theme/chrome');
require('brace/theme/idle_fingers');
require('brace/keybinding/vim');

var Cassandra = require('./connectors/cassandra/Renderer.js');
var Mysql = require('./connectors/mysql/Renderer.js');
var MSsql = require('./connectors/mssql/Renderer.js');
var Firebase = require('./connectors/firebase/Renderer.js');

var ObjectInfo = React.createClass({

    getInitialState: function(){
        this.scripts = [];
        return null;
    },

    componentDidMount: function(){

        TabsStore.bind('change-theme', this.changeThemeHandler);
        TabsStore.bind('change-schema-filter', this.changeSchemaFilter);

        if (this.scripts.length > 0){

            this.editor = Ace.edit("script_"+this.props.eventKey);
            this.editor.setOptions({
                maxLines: 1000,
                showGutter: false,
                showPrintMargin: false,
                highlightActiveLine: false,
                readOnly: true,
            });
            this.editor.renderer.$cursorLayer.element.style.opacity=0;
            this.editor.getSession().setMode('ace/mode/pgsql');
            this.editor.setTheme('ace/theme/' + TabsStore.getEditorTheme());

            var script = '';
            for (var i=0; i<this.scripts.length; i++){
                script += this.scripts[i];
                script += ';\n---\n\n';
            }
            this.editor.session.setValue(script, -1);
        }
    },

    componentWillUnmount: function(){
        TabsStore.unbind('change-theme', this.changeThemeHandler);
    },

    changeThemeHandler: function(){
        if (typeof(this.editor) != 'undefined'){
            this.editor.setTheme('ace/theme/' + TabsStore.getEditorTheme());
        }
    },

    changeSchemaFilter: function(){
        if (this.props.info.object_type == 'database') {
            this.forceUpdate();
        }
    },

    filterSchemas: function(item){
         if (TabsStore.schemaFilter) {
             if (TabsStore.schemaFilterMode === 'white') {
                 return TabsStore.schemaFilterCompiledRegEx.test(item);
             } else {
                 return !TabsStore.schemaFilterCompiledRegEx.test(item);
             }
         }
         return true;
    },

    getInfo: function(object){
        Actions.getObjectInfo(object);
    },

    render_function_info: function(info){
        var self = this;
        this.scripts = info.object.scripts;
        var div_id = "script_"+self.props.eventKey;

        return (<div className="object-info-div">
            Function &nbsp;
            <span className="object-info-name">
            <a href="#" onClick={function(){self.getInfo(info.object.schema_name+'.');}}>{info.object.schema_name}</a>.{info.object.function_name}
            </span>
            &nbsp; <a href="#" onClick={function(){Actions.newTab(self.scripts.join(';\n---\n\n'));}}><span className="glyphicon glyphicon-edit" title="edit"/></a>
            <hr/>
            <div key={div_id} id={div_id}></div>
        </div>
        );
    },

    render_trigger_info: function(info){
        var self = this;
        this.scripts = [info.object.script];
        var div_id = "script_"+self.props.eventKey;

        return (<div className="object-info-div">
            Trigger &nbsp;
            <span className="object-info-name"> {info.object_name} on &nbsp;
            <a href="#" onClick={function(){self.getInfo(info.object.table);}}>{info.object.table}</a>
            </span>
            &nbsp; <a href="#" onClick={function(){Actions.newTab(self.scripts.join(';\n---\n\n'));}}><span className="glyphicon glyphicon-edit" title="edit"/></a>
            <hr/>
            <div key={div_id} id={div_id}></div>
        </div>
        );

    },

    render_schema_info: function(info){
        var self = this;

        var tables = info.object.tables.map(function(item, idx){
            var id = "table_"+self.props.eventKey+"_"+idx;
            var full_object_name = info.object_name+'.'+item; // schema.table
            return <li key={id}><a href="#" onClick={function(){self.getInfo(full_object_name)}}>{item}</a></li>
        });

        var functions = info.object.functions.map(function(item, idx){
            var id = "function_"+self.props.eventKey+"_"+idx;
            var full_object_name = info.object_name+'.'+item; // schema.function
            return <li key={id}><a href="#" onClick={function(){self.getInfo(full_object_name)}}>{item}</a></li>
        });

        var views = info.object.views.map(function(item, idx){
            var id = "view_"+self.props.eventKey+"_"+idx;
            var full_object_name = info.object_name+'.'+item; // schema.function
            return <li key={id}><a href="#" onClick={function(){self.getInfo(full_object_name)}}>{item}</a></li>
        });

        var sequences = info.object.sequences.map(function(item, idx){
            var id = "sequence_"+self.props.eventKey+"_"+idx;
            var full_object_name = info.object_name+'.'+item; // schema.sequence
            return <li key={id}><a href="#" onClick={function(){self.getInfo(full_object_name)}}>{item}</a></li>
        });

        var gotop = <a href="#" onClick={function(){scrollTo(
                    '#output-console-'+self.props.eventKey, "#output-console-"+self.props.eventKey
                    )}}><span className="glyphicon glyphicon-circle-arrow-up"/></a>;

        return (<div className="object-info-div">Schema <span className="object-info-name">{info.object_name} </span>
                at <a href="#" onClick={function(){self.getInfo()}}>{info.object.current_database}</a>

                <ul className="schema-nav nav nav-pills">
                  <li role="presentation"><a href="#" onClick={function(){
                      scrollTo('#output-console-'+self.props.eventKey, '#tables-'+self.props.eventKey);
                  }}> Tables ({tables.length}) </a></li>

                  <li role="presentation"><a href="#" onClick={function(){
                      scrollTo('#output-console-'+self.props.eventKey, '#functions-'+self.props.eventKey);
                  }}> Functions ({functions.length}) </a></li>

                  <li role="presentation"><a href="#" onClick={function(){
                      scrollTo('#output-console-'+self.props.eventKey, '#views-'+self.props.eventKey);
                  }}> Views ({views.length}) </a></li>

                  <li role="presentation"><a href="#" onClick={function(){
                      scrollTo('#output-console-'+self.props.eventKey, '#sequences-'+self.props.eventKey);
                  }}> Sequences ({sequences.length}) </a></li>
                </ul>

                <hr/>
            <div id={"tables-"+this.props.eventKey}> {gotop} Tables:
                <ul>
                    {tables}
                </ul>
            </div>
            <div id={"functions-"+this.props.eventKey}> {gotop} Functions:
                <ul>
                    {functions}
                </ul>
            </div>
            <div id={"views-"+this.props.eventKey}> {gotop} Views:
                <ul>
                    {views}
                </ul>
            </div>
            <div id={"sequences-"+this.props.eventKey}> {gotop} Sequences:
                <ul>
                    {sequences}
                </ul>
            </div>
        </div>
        );
    },

    render_db_info: function(info){
        var self = this;

        var gotop = <a href="#" onClick={function(){scrollTo(
                    '#output-console-'+self.props.eventKey, "#output-console-"+self.props.eventKey
                    )}}><span className="glyphicon glyphicon-circle-arrow-up"/></a>;

        var schemas = info.object.schemas.filter(this.filterSchemas).map(function(item, idx){
            var id = "schema_"+self.props.eventKey+"_"+idx;
            return <li key={id}><a href="#" onClick={function(){self.getInfo(item+'.');}}>{item}</a></li>
        });
        var roles = info.object.roles.map(function(item, idx){
            var id = "role_"+self.props.eventKey+"_"+idx;
            return <li key={id}>{item}</li>
        });
        var databases = info.object.databases.map(function(item, idx){
            var id = "database_"+self.props.eventKey+"_"+idx;
            return <li key={id}>{item}</li>
        });
        var tablespaces = info.object.tablespaces.map(function(item, idx){
            var id = "tablespace_"+self.props.eventKey+"_"+idx;
            return <li key={id}>{item}</li>
        });
        var event_triggers = info.object.event_triggers.map(function(item, idx){
            var id = "event_trigger_"+self.props.eventKey+"_"+idx;
            return <li key={id}>{item}</li>
        });

        return (<div className="object-info-div">Database <span className="object-info-name">{info.object_name}</span> <br/>
            {info.object.version}


            <ul className="schema-nav nav nav-pills">
              <li role="presentation"><a href="#" onClick={function(){
                  scrollTo('#output-console-'+self.props.eventKey, '#schemas-'+self.props.eventKey);
              }}> Schemas ({schemas.length}) </a></li>

              <li role="presentation"><a href="#" onClick={function(){
                  scrollTo('#output-console-'+self.props.eventKey, '#roles-'+self.props.eventKey);
              }}> Roles ({roles.length}) </a></li>

              <li role="presentation"><a href="#" onClick={function(){
                  scrollTo('#output-console-'+self.props.eventKey, '#databases-'+self.props.eventKey);
              }}> Databases ({databases.length}) </a></li>

              <li role="presentation"><a href="#" onClick={function(){
                  scrollTo('#output-console-'+self.props.eventKey, '#tablespaces-'+self.props.eventKey);
              }}> Tablespaces ({tablespaces.length}) </a></li>
              <li role="presentation"><a href="#" onClick={function(){
                  scrollTo('#output-console-'+self.props.eventKey, '#event-triggers-'+self.props.eventKey);
              }}> Event Triggers ({event_triggers.length}) </a></li>
            </ul>

            <hr/>
            <div id={"schemas-"+this.props.eventKey}> {gotop} Schemas:
                <ul>
                    {schemas}
                </ul>
            </div>
            <div id={"roles-"+this.props.eventKey}> {gotop} Roles:
                <ul>
                    {roles}
                </ul>
            </div>
            <div id={"databases-"+this.props.eventKey}> {gotop} Databases:
                <ul>
                    {databases}
                </ul>
            </div>

            <div id={"tablespaces-"+this.props.eventKey}> {gotop} Tablespaces:
                <ul>
                    {tablespaces}
                </ul>
            </div>

            <div id={"event-triggers-"+this.props.eventKey}> {gotop} Event Triggers:
                <ul>
                    {event_triggers}
                </ul>
            </div>
        </div>);
    },

    render_relation_info: function(info){
        var self = this;

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
        var script = `SELECT *
FROM `+info.object_name+`
WHERE true
LIMIT 100;`;
        var view = <a href="#" onClick={function(){Actions.newTab(script);}}><span className="glyphicon glyphicon-new-window" title="view"/></a>
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

        // foreign keys
        if (info.object.foreign_keys != null){
            var foreign_keys = [];
            for (var i=0; i < info.object.foreign_keys.length; i++){
                var fk = info.object.foreign_keys[i];
                var fk = <p key={"fk_" + fk.name}>
                    <span className="ace_keyword">CONSTRAINT</span> {fk.name}
                    <span className="ace_keyword"> FOREIGN KEY </span> {fk.columns}
                    <span className="ace_keyword"> REFERENCES </span> {fk.references}
                </p>;
                foreign_keys.push(fk);
            }
        } else {
            var foreign_keys = null;
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
                var id = 'trigger_'+self.eventKey+'+'+idx;
                return <li key={id}><a href="#" onClick={function(){self.getInfo('trigger:'+item.oid);}}>{item.trigger_name}</a></li>;
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
                <a href="#" onClick={function(){self.getInfo(info.object.schema+'.');}}>{info.object.schema}</a>.{info.object.relname}
                &nbsp; {edit} &nbsp; {view}
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
            {foreign_keys}
            {triggers}
            {records}
            {size}
            {total_size}
            {view_script}
        </div>
        );
    },

    render: function(){
        var info = this.props.info;

        if (info.connector == 'mysql'){
            return Mysql.info(this.props.eventKey, info, this.getInfo);
        } else if (info.connector == 'mssql'){
            return MSsql.info(this.props.eventKey, info, this.getInfo);
        } else if (info.connector == 'firebase'){
            return Firebase.info(this.props.eventKey, info, this.getInfo);
        } else {

            if (info.object_type == 'function'){
                return this.render_function_info(info);
            } else if (info.object_type == 'relation'){
                return this.render_relation_info(info);
            } else if (info.object_type == 'database'){
                return this.render_db_info(info);
            } else if (info.object_type == 'schema'){
                return this.render_schema_info(info);
            } else if (info.object_type == 'trigger'){
                return this.render_trigger_info(info);
            } else if (info.object_type == 'cassandra_cluster'){
                return Cassandra.renderCluster(this.props.eventKey, info, this.getInfo);
            } else if (info.object_type == 'cassandra_keyspace'){
                return Cassandra.renderKeyspace(this.props.eventKey, info, this.getInfo);
            } else if (info.object_type == 'cassandra_table'){
                return Cassandra.renderTable(this.props.eventKey, info, this.getInfo);
            } else {
                return (
                    <div className="alert alert-danger">Not supported object type: {info.object_type}</div>
                );
            }
        }
    }
});

module.exports = ObjectInfo;
