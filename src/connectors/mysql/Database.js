var async = require('async');
var mysql = require('mysql2');
var url = require('url');
var Words = require('./keywords.js');

var Clients = {};
var InfoClients = {};

var Types = [];
for (var type in mysql.Types) {
	Types[mysql.Types[type]] = type;
}

var parse_connstr = function(connstr){

    if (connstr.indexOf('---') > 0){
        connstr = connstr.split('---')[0];
    }

    var parsed = url.parse(connstr);

    var database = '';
    if (parsed.pathname != 'undefined' && parsed.pathname != null){
        database = parsed.pathname.substring(1);
    }

    var user = '';
    var password = '';
    if (parsed.auth){
        user = parsed.auth.split(':')[0];
        password = parsed.auth.split(':')[1];
    }

    return {
        host: parsed.hostname,
        port: parsed.port,
        user: user,
        password: password,
        database: database,
        multipleStatements: true,
    }
}

function formatDate(date, type) {
    if (date == null){
        return date;
    }
    var month = date.getMonth() + 1;
    var day = date.getDate();
    var hour = date.getHours();
    var min = date.getMinutes();
    var sec = date.getSeconds();
    var msec = date.getMilliseconds();

    month = (month < 10 ? "0" : "") + month;
    day = (day < 10 ? "0" : "") + day;
    hour = (hour < 10 ? "0" : "") + hour;
    min = (min < 10 ? "0" : "") + min;
    sec = (sec < 10 ? "0" : "") + sec;

    var str;
    if (type == 'DATE'){
        str = date.getFullYear() + "-" + month + "-" + day;
    } else {
        str = date.getFullYear() + "-" + month + "-" + day + " " +  hour + ":" + min + ":" + sec + "." + msec;
    }

    return str;
}

var Response = function(query){
    this.connector_type = "mysql";
    this.query = query;
    //this.block = query
    this.datasets = [];
    this.start_time = performance.now();
    this.duration = null;
    var self = this;
    this.finish = function(){
        self.duration = Math.round((performance.now() - self.start_time)*1000)/1000;
    };
    this.processResult = function(result, fielddata){

        if (result.constructor.name == "ResultSetHeader"){ // no fields, command execution
            result = [result];
            fielddata = [0];
        }

        // if single dataset convert it to multiple datasets
        if (fielddata.length > 0 && typeof(fielddata[0]) != "undefined" && fielddata[0].constructor.name == "ColumnDefinition"){
            result = [result];
            fielddata = [fielddata];
        }
        // if dataset is empty but there are fields means no records but dataset should be created anyway
        if (result.length == 0 && fielddata){
            result = [0];
            fielddata = [fielddata];
        }

        for (var res in fielddata){
            if (result[res].constructor.name == "ResultSetHeader"){ // command
                self.datasets.push({
                    nrecords: 0,
                    fields: null,
                    explain: false,
                    data: null,
                    cmdStatus: "Query OK, Affected rows: "+result[res].affectedRows+", Warnings: "+result[res].warningStatus,
                    resultStatus: "PGRES_COMMAND_OK",
                    resultErrorMessage: null,
                });

            } else { // dataset
                var fields = [];
                for (var fn in fielddata[res]){
                    if (typeof(fielddata[res][fn]) != 'undefined'){
                        fields.push({
                            name: fielddata[res][fn].name,
                            type: Types[fielddata[res][fn].columnType].toUpperCase(),
                        });
                    }
                }

                var records = [];
                for (var rn in result[res]){
                    var rec = [];
                    for (var column in fields) {
                        var value = result[res][rn][fields[column].name];
                        var type = fields[column].type;
                        if(['TEXT', 'VARCHAR', 'ASCII', 'STRING', 'VAR_STRING'].indexOf(type) > -1){
                            rec.push(value);
                        } else if (['TIMESTAMP', 'DATE', 'DATETIME'].indexOf(type) > -1) {
                            rec.push(formatDate(value, type));
                        } else {
                            rec.push(JSON.stringify(value));
                        }
                    }
                    records.push(rec);
                }

                self.datasets.push({
                    nrecords: records.length,
                    fields: fields,
                    explain: false,
                    data: records,
                    cmdStatus: null,
                    resultStatus: null,
                    resultErrorMessage: null,
                });

            }
        }
    };
}

var Database = {

    DEFAULT_PORT: 3306,

    getClient: function(id, connstr, password, cache){
        if (typeof(cache) == "undefined"){
            cache = Clients;
        }
        if (id in cache && cache[id].connstr == connstr && cache[id].config.password == password){
            return cache[id];
        } else {
            var parsed_connstr = parse_connstr(connstr);
            if (parsed_connstr.password == null){
                parsed_connstr.password = password;
            }
            var client  = new mysql.createConnection(parsed_connstr);
            client.connstr = connstr;
            cache[id] = client;
            return cache[id];
        }
    },

    getInfoClient: function(id, connstr, password){
        return this.getClient(id, connstr, password, InfoClients);
    },

    runQuery: function(id, connstr, password, query, callback, err_callback){
        var client = this.getClient(id, connstr, password);
        var response = new Response(query);
        client.query(query.replace(/^\s*---.*/mg,''),
        function(err, result, fielddata){
            if (err){
                err_callback(id, err);
            } else {
                response.finish();
                response.processResult(result, fielddata);
                callback(id, [response]);
            }
        });

    },

    cancelQuery: function(id){
        var client = Clients[id];
        var extraClient = this.getClient(id, client.connstr, client.config.password, {});
        extraClient.query("KILL QUERY "+client.connectionId, function(err){
            if (err){
                console.log(err);
            }
        });
    },

    _getData: function(id, connstr, password, query, callback, err_callback){
        var client = this.getInfoClient(id, connstr, password);
        client.query(query.replace(/^\s*---.*/mg,''),
            function(err, result){
                if (err){
                    err_callback(err);
                } else {
                    callback(result);
                }
            }
        );

    },

    testConnection: function(id, connstr, password, callback, ask_password_callback, err_callback){
        var client = this.getClient(id, connstr, password);
        var query = "SELECT 'connected' FROM dual WHERE 1=0";
        var response = new Response(query);
        client.query(query,
            function(err, result, fielddata){
                if (err){
                    if (err.code == "ER_ACCESS_DENIED_ERROR"){
                            ask_password_callback(id, err);
                    } else {
                            err_callback(id, err);
                    }
                } else {
                    response.finish();
                    response.processResult(result, fielddata);
                    callback(id, [response]);
                }
            }
        );
    },

    getCompletionWords: function(callback){

//        var hash_query = "select md5((group_concat(word order by word separator ''))) from ( \
//select schema_name word from information_schema.schemata union \
//select column_name from information_schema.columns union \
//select table_name from information_schema.tables union \
//select table_name from information_schema.views) a";

        var query = "select word from ( \
select schema_name word from information_schema.schemata union \
select column_name from information_schema.columns union \
select table_name from information_schema.tables union \
select table_name from information_schema.views) a order by word";

        if (Object.keys(Clients).length == 0){
            callback(Words);
        } else {
            for (var tab in Clients){
                this._getData(0, Clients[tab].connstr, Clients[tab].config.password, query,
                function(data){
                    for (var rn in data){
                        var word = data[rn]["word"];
                        if (Words.indexOf(word) == -1){
                            Words.push(word);
                        }
                    }
                    Words.sort();
                    callback(Words);
                },
                function(){
                    callback(Words);
                })
            }
        }
    },

    getObjectInfo: function(id, connstr, password, object, callback, err_callback){

        // if no object selected then get info about database
        var ret;
        if (typeof(object) == 'undefined' || object == '' || object == null){
            ret = {
                connector: 'mysql',
                object_type: 'database',
                object: null,
                object_name: null
            };
            this._getDatabaseInfo(id, connstr, password,
            function(db_info){
                ret.object = db_info;
                ret.object_name = db_info.dbname;
                callback(id, ret);
            },
            function(err){
                err_callback(id, err);
            })
            return;
        } else if (object.slice(-1) == '.'){ // get schema info
            var schema = object.slice(0, object.length-1);
            ret = {
                connector: 'mysql',
                object_type: 'schema',
                object: null,
                object_name: null
            };
            this._getSchemaInfo(id, connstr, password, schema,
                function(schema_info){
                    ret.object = schema_info;
                    ret.object_name = schema_info.schema_name;
                    callback(id, ret);
                },
                function(err){
                    err_callback(id, err);
                })
            return;
        } else { // get object info
            ret = {
                connector: 'mysql',
                object_type: "relation",
                object: null,
                object_name: null
            };

            this._getTableInfo(id, connstr, password, object,
                function(object_info){
                    ret.object = object_info;
                    if (object_info){
                        ret.object_name = object_info.relname;
                    } else {
                        ret.object_name = object;
                    }
                    callback(id, ret);
                },
                function(err){
                    err_callback(id, err);
                }
            );
            return;
        }
    },

    runBlocks: function(id, connstr, password, blocks, callback, err_callback){
        var results = [];
        var client = this.getClient(id, connstr, password);

        var calls = [];
        for (var i=0; i<blocks.length; i++){
            var call = function(block){return function(done){
            var response = new Response(block);
            client.query(block.replace(/^\s*---.*/mg,''),
            function(err, result, fielddata){
                    if (err) {
                        err_callback(id, err);
                            done();
                    } else {
                        response.finish();
                        response.processResult(result, fielddata);
                            results.push(response);
                            done();
                    }
		});
            }}(blocks[i]);
            calls.push(call);
        }

        async.series(calls, function(){
            callback(id, results);
        });

    },

    _getDatabaseInfo: function(id, connstr, password, callback, err_callback){

        var self = this;

        var current_database = null;
        var version = null;
        var schemas = [];
        var databases = [];
        var roles = [];
        var tablespaces = [];
        var event_triggers = [];

        // get current dbname
        var get_current_database = function(done){
            var query = "SELECT SV0.VARIABLE_VALUE hostname, \
CONCAT(COALESCE(SV1.VARIABLE_VALUE,''),' ',COALESCE(SV2.VARIABLE_VALUE,''), ' on ',COALESCE(SV3.VARIABLE_VALUE,''),', ',COALESCE(SV4.VARIABLE_VALUE,'')) version \
FROM information_schema.SESSION_VARIABLES SV0 \
LEFT OUTER JOIN information_schema.SESSION_VARIABLES SV1 ON SV1.Variable_Name = 'VERSION_COMMENT' \
LEFT OUTER JOIN information_schema.SESSION_VARIABLES SV2 ON SV2.Variable_Name = 'VERSION' \
LEFT OUTER JOIN information_schema.SESSION_VARIABLES SV3 ON SV3.Variable_Name = 'VERSION_COMPILE_OS' \
LEFT OUTER JOIN information_schema.SESSION_VARIABLES SV4 ON SV4.Variable_Name = 'VERSION_COMPILE_MACHINE' \
WHERE SV0.Variable_Name = 'Hostname'";
            self._getData(id, connstr, password, query,
            function(data){
                if (data.length > 0){
                    current_database = data[0]['hostname'];
                    version = data[0]['version'];
                }
                done();
            },
            err_callback);
        };

        // get roles
        var get_roles = function(done){
            var query = "SELECT DISTINCT USER FROM mysql.user ORDER BY 1;";
            self._getData(id, connstr, password, query,
            function(data){
                if (data.length > 0){
                    roles = data.map(function(item){return item['USER'];});
                }
                done();
            },
            function(err){
                if (err.code == "ER_TABLEACCESS_DENIED_ERROR"){ // ignore permission denied error and return empty list
                    done();
                } else {
                    err_callback(err);
                }
            });
        }

        // get schemas
        var get_schemas = function(done){
            var query = "SELECT schema_name FROM information_schema.SCHEMATA ORDER BY 1;";
            self._getData(id, connstr, password, query,
            function(data){
                if (data.length > 0){
                    schemas = data.map(function(item){return item['schema_name'];});
                }
                done();
            },
            err_callback);
        }

        // get tablespaces
        var get_tablespaces = function(done){
            var query = "SELECT tablespace_name FROM information_schema.TABLESPACES ORDER BY 1;";
            self._getData(id, connstr, password, query,
            function(data){
                if (data.length > 0){
                    tablespaces = data.map(function(item){return item['tablespace_name'];});
                }
                done();
            },
            err_callback);
        }

        // get event triggers
        var get_event_triggers = function(done){
            var query = "SELECT trigger_name FROM information_schema.TRIGGERS;";
            self._getData(id, connstr, password, query,
            function(data){
                if (data.length > 0){
                    event_triggers = data.map(function(item){return item['trigger_name'];});
                }
                done();
            },
            err_callback);
        }

        async.series([get_current_database, get_roles, get_schemas, get_tablespaces, get_event_triggers], function(){
            var database = {
                dbname: current_database,
                version: version,
                schemas: schemas,
                roles: roles,
                databases: databases,
                tablespaces: tablespaces,
                event_triggers: event_triggers,
            };
            return callback(database);
        });
    },

    _getTableInfo: function(id, connstr, password, object, callback, err_callback){
        var self = this;

        var query = "SELECT table_schema, table_name, table_type, COALESCE(data_length, 0) data_length, COALESCE(round(((data_length + index_length) / 1024 / 1024), 2), 0) total_size, COALESCE(table_rows,0) table_rows FROM information_schema.TABLES WHERE UPPER(CONCAT(table_schema,'.',table_name)) = UPPER('" + object + "') ORDER BY 3 DESC;";
        this._getData(id, connstr, password, query,
        function(data){
            if (data.length > 0){
                var row = data[0];
                var relation = {
                    schema: row['table_schema'],
                    relname: row['table_name'],
                    relkind: row['table_type'],
                    size: row['data_length'],
                    total_size: row['total_size'],
                    records: row['table_rows'],
                };

                /// fill the relation object with details

                var get_columns = function(done){
                    self._getRelationColumns(id, connstr, password, object,
                    function(columns){
                        relation.columns = columns;
                        done();
                    },
                    err_callback);
                };

                var get_indexes = function(done){
                    self._getRelationIndexes(id, connstr, password, object,
                    function(indexes){
                        relation.indexes = indexes;
                        done();
                    },
                    err_callback);
                };

                var get_check_constraints = function(done){
                    self._getCheckConstraints(id, connstr, password, object,
                    function(constraints){
                        relation.check_constraints = constraints;
                        done();
                    },
                    err_callback);
                };

                var get_pk = function(done){
                    self._getRelationPK(id, connstr, password, object,
                    function(pk){
                        relation.pk = pk;
                        done();
                    },
                    err_callback);
                };

                var get_triggers = function(done){
                    self._getTriggers(id, connstr, password, object,
                    function(triggers){
                        relation.triggers = triggers;
                        done();
                    },
                    err_callback);
                };
		// TODO
		/*

                var get_view_def = function(done){
                    if (relation.relkind == 'v'){
                        var query = "select * from pg_get_viewdef('"+object+"')";
                        self._getData(id, connstr, password, query,
                        function(script){
                            relation.script = 'CREATE OR REPLACE VIEW '+object+' AS \n'+script;
                            done();
                        },
                        err_callback);
                    } else {
                        done();
                    }
                }

                var get_sequence_info = function(done){
                    if (relation.relkind == 'S'){
                        var query = "select last_value, start_value, increment_by, max_value, min_value, cache_value, log_cnt, is_cycled, is_called from "+object;
                        self._getData(id, connstr, password, query,
                        function(data){
                            if (data.length > 0){
                                relation.params = {
                                    last_value: data[0][0],
                                    start_value: data[0][1],
                                    increment_by: data[0][2],
                                    max_value: data[0][3],
                                    min_value: data[0][4],
                                    cache_value: data[0][5],
                                    log_cnt: data[0][6],
                                    is_cycled: data[0][7],
                                    is_called: data[0][8],
                                };
                            }
                            done();
                        },
                        err_callback);
                    } else {
                        done();
                    }
                }

                async.series([get_columns, get_pk, get_check_constraints, get_indexes, get_triggers, get_view_def, get_sequence_info],
		*/
                async.series([get_columns, get_pk, get_check_constraints, get_indexes, get_triggers],
                function(){
                    callback(relation);
                }
                );

            } else {
                callback(null);
            }
        },
        function(){
            callback(null); // ignore error, behave like relation not found
        });
    },

    _getRelationColumns: function(id, connstr, password, object, callback, err_callback){

        var query = "SELECT COLUMN_NAME, DATA_TYPE, COALESCE(CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION) MAXIMUM_LENGTH, IS_NULLABLE, 'YES' HAS_DEFAULT, COLUMN_DEFAULT, COLUMN_COMMENT FROM information_schema.COLUMNS WHERE UPPER(CONCAT(table_schema,'.',table_name)) = UPPER('" + object  + "') ORDER BY ORDINAL_POSITION;";
        this._getData(id, connstr, password, query,
        function(data){
            var columns = [];
            for (var i=0; i<data.length; i++){
                var row = data[i];
		var notnull = "t";
		if(row['IS_NULLABLE']=="YES") { notnull = "f"; }
                var column = {
                    name: row['COLUMN_NAME'],
                    type: row['DATA_TYPE'],
                    max_length: row['MAXIMUM_LENGTH'],
                    not_null: notnull,
                    has_default: row['HAS_DEFAULT'],
                    default_value: row['COLUMN_DEFAULT'],
                    description: row['COLUMN_COMMENT']
                };
                columns.push(column);
            }
            callback(columns);
        },
        err_callback);
    },

    _getRelationIndexes: function(id, connstr, password, object, callback, err_callback){
	var query = "SELECT INDEX_NAME, INDEX_TYPE, NON_UNIQUE, GROUP_CONCAT(column_name ORDER BY seq_in_index) AS INDEX_COLUMNS FROM information_schema.statistics WHERE UPPER(CONCAT(table_schema,'.',table_name)) = UPPER('" + object  + "') GROUP BY 1, 2, 3;"
        this._getData(id, connstr, password, query,
        function(data){
            var indexes = [];
            for (var i=0; i<data.length; i++){
                var row = data[i];
                var index = {
                        name: row['INDEX_NAME'],
                        non_unique: row['NON_UNIQUE'],
                        method: row['INDEX_TYPE'],
                        columns: row['INDEX_COLUMNS'],
                        comment: row['INDEX_COMMENT'],
                };
                indexes.push(index);
            }
            callback(indexes);
        },
        err_callback);
    },

    _getCheckConstraints: function(id, connstr, password, object, callback, err_callback){
	var query = "SELECT CONSTRAINT_NAME, GROUP_CONCAT(COALESCE(NULLIF(CONCAT_WS('.',REFERENCED_TABLE_SCHEMA,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME),''),COLUMN_NAME) ORDER BY ORDINAL_POSITION) AS CONSTRAINT_COLUMNS FROM information_schema.key_column_usage WHERE UPPER(CONCAT(table_schema,'.',table_name)) = UPPER('" + object  + "') AND CONSTRAINT_NAME != 'PRIMARY' AND POSITION_IN_UNIQUE_CONSTRAINT IS NOT NULL GROUP BY 1;";
        this._getData(id, connstr, password, query,
        function(data){
            var checks = [];
            for (var i=0; i<data.length; i++){
                var row = data[i];
                var check = {
                        name: row['CONSTRAINT_NAME'],
                        columns: row['CONSTRAINT_COLUMNS'],
                };
                checks.push(check);
            }
            callback(checks);
        },
        err_callback);
    },

    _getRelationPK: function(id, connstr, password, object, callback, err_callback){
	var query = "SELECT CONSTRAINT_NAME PK_NAME, GROUP_CONCAT(COALESCE(NULLIF(CONCAT_WS('.',REFERENCED_TABLE_SCHEMA,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME),''),COLUMN_NAME) ORDER BY ORDINAL_POSITION) AS PK_COLUMNS FROM information_schema.key_column_usage WHERE UPPER(CONCAT(table_schema,'.',table_name)) = UPPER('" + object  + "') AND CONSTRAINT_NAME = 'PRIMARY' AND POSITION_IN_UNIQUE_CONSTRAINT IS NULL GROUP BY 1;";
        this._getData(id, connstr, password, query,
        function(data){
            var pks = [];
            for (var i=0; i<data.length; i++){
                var row = data[i];
                var pk = {
                        name: row['PK_NAME'],
                        columns: row['PK_COLUMNS'],
                };
                pks.push(pk);
            }
            callback(pks);
        },
        err_callback);
    },

    _getTriggers: function(id, connstr, password, object, callback, err_callback){
	var query = "SELECT * FROM information_schema.triggers WHERE UPPER(CONCAT(EVENT_OBJECT_SCHEMA,'.',EVENT_OBJECT_TABLE)) = UPPER('" + object  + "');";
        this._getData(id, connstr, password, query,
        function(data){
            var triggers = [];
            for (var i=0; i<data.length; i++){
                var row = data[i];
                var trigger = {
                        name: row['TRIGGER_NAME'],
                        timing: row['ACTION_TIMING'],
                        manipulation: row['EVENT_MANIPULATION'],
                        orientation: row['ACTION_ORIENTATION'],
                        statement: row['ACTION_STATEMENT'],
                };
                triggers.push(trigger);
            }
            callback(triggers);
        },
        err_callback);
    },

    _getSchemaInfo: function(id, connstr, password, schema_name, callback, err_callback){
        var self = this;
        var current_database = null;
        var tables = [];
        var functions = [];
        var views = [];
        var sequences = [];

        // get hostname
        var get_current_database = function(done){
            var query = "SHOW VARIABLES WHERE Variable_name = 'hostname';";
            self._getData(id, connstr, password, query,
            function(data){
                if (data.length > 0){
                    current_database = data[0]['Value'];
                }
                done();
            },
            err_callback);
        };

        // get tables
        var get_tables = function(done){
            var query = "SELECT table_name FROM information_schema.TABLES WHERE Table_Schema = '"+schema_name+"' AND Table_Type LIKE '%TABLE%' ORDER BY 1;";
            self._getData(id, connstr, password, query,
            function(data){
                if (data.length > 0){
                    tables = data.map(function(item){return item['table_name'];});
                }
                done();
            },
            err_callback);
        }

        // get functions
        var get_functions = function(done){
            var query = "SELECT routine_name FROM information_schema.ROUTINES WHERE routine_schema = '"+schema_name+"' ORDER BY 1;";
            self._getData(id, connstr, password, query,
            function(data){
                if (data.length > 0){
                    functions = data.map(function(item){return item['routine_name'];});
                }
                done();
            },
            err_callback);

        }

        // get views
        var get_views = function(done){
            var query = "SELECT table_name FROM information_schema.TABLES WHERE Table_Schema = '"+schema_name+"' AND Table_Type LIKE '%VIEW%' ORDER BY 1;";
            self._getData(id, connstr, password, query,
            function(data){
                if (data.length > 0){
                    views = data.map(function(item){return item['table_name'];});
                }
                done();
            },
            err_callback);
        }

        async.series([get_current_database, get_tables, get_functions, get_views], function(){
            var schema = {
                schema_name: schema_name,
                tables: tables,
                functions: functions,
                views: views,
                sequences: sequences,
                current_database: current_database,
            };
            callback(schema);
        });
    },

}

module.exports = Database;
