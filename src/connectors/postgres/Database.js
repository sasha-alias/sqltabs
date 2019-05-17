var async = require('async');
var PqClient = require('./PqClient');
var Words = require('./keywords.js');

var Clients = {}; // clients used for executing user queries
var InfoClients = {}; // clients used for getting info about objects
var AutocompletionHashes = {};

var Database = {

    DEFAULT_PORT: 5432,

    redshift: false,

    _getClient: function(id, connstr, password, cache){

        var client;
        if (id in cache && cache[id].connstr == connstr && cache[id].connected){
            client = cache[id];
            if (client.isBusy){ // when previous query is running
                client.silentCancel(); // just drop it
                client = new PqClient(connstr, password, this.redshift); // and get new client, so async errors won't come in
                cache[id] = client;
            }
            client.setPassword(password);
        } else {
            client = new PqClient(connstr, password, this.redshift);
            cache[id] = client;
        }
        return client;
    },

    getClient: function(id, connstr, password){
        return this._getClient(id, connstr, password, Clients);
    },

    getInfoClient: function(id, connstr, password){
        return this._getClient(id, connstr, password, InfoClients);
    },

    runQuery: function(id, connstr, password, query, callback, err_callback){
        var client = this.getClient(id, connstr, password);
        client.sendQuery(query,
            function(result){callback(id, [result])},
            function(err){err_callback(id, err)}
        );

    },

    cancelQuery: function(id){
        if (id in Clients){
            Clients[id].cancel();
        }
    },

    runBlocks: function(id, connstr, password, blocks, callback, err_callback){
        var results = [];
        var client = this.getClient(id, connstr, password);

        var calls = [];
        for (var i=0; i<blocks.length; i++){
            var call = function(block){return function(done){
                client.sendQuery(block,
                function(result){
                    results.push(result);
                    done();
                },
                function(err){
                    err_callback(err);
                    done(-1);
                });

            }}(blocks[i]);
            calls.push(call);
        }

        async.series(calls, function(){
            callback(id, results);
        });

    },

    testConnection: function(id, connstr, password, callback, ask_password_callback, err_callback){

        delete Clients[id];

        var client = this.getClient(id, connstr, password);

        client.sendQuery("select 0 as connected where 1=0",
            function(result){
                callback(id, [result]);
            },
            function(err){
                if (typeof(err.code) != 'undefined' && ["28000", "28P01"].indexOf(err.code) > -1){
                    ask_password_callback(id, err);
                } else {
                    err_callback(id, err);
                }
            }
        );
    },


    getObjectInfo: function(id, connstr, password, object, callback, err_callback){

        var self = this;
        var ret;

        // if no object selected then get info about database
        if (typeof(object) == 'undefined' || object == '' || object == null){
            ret = {object_type: 'database', object: null, object_name: null};
            this._get_db_info(id, connstr, password,
            function(db_info){
                ret.object = db_info;
                ret.object_name = db_info.dbname;
                callback(id, ret);
            },
            function(err){
                err_callback(id, err);
            })
            return;
        }

        // if dot placed in the end then get information about schema (example: "myschema." )
        if (object.slice(-1) == '.'){
            var schema_name = object.slice(0, object.length-1);
            ret = {object_type: 'schema', object: null, object_name: schema_name};
            this._get_schema_info(id, connstr, password, schema_name,
            function(schema_info){
                ret.object = schema_info;
                callback(id, ret);
            },
            function(err){
                err_callback(id, err);
            })
            return;
        }

        // if starts with "trigger:" find trigger
        if (object.indexOf('trigger:') == 0){

            ret = {object_type: 'trigger', object: null, object_name: null}
            var oid = object.split(':')[1];

            this._getTrigger(id, connstr, password, oid,
            function(trigger){
                ret.object = trigger;
                ret.object_name = trigger.trigger_name;
                callback(id, ret);
            },
            err_callback);
            return;
        }

        // try to find relation
        object = self._quoteObject(object);
        self._findRelation(id, connstr, password, object,
        function(relation){
            var ret = {object_type: "relation", object: relation, object_name: object};

            if (relation != null){

                callback(id, ret);

            } else {
                // relation not found, try functions
                self._findProc(id, connstr, password, object,
                function(func){
                    if (func && func.scripts.length > 0){
                        var funcs = {object_type: "function", object: func, object_name: null};
                        return callback(id, funcs);
                    } else {
                        return callback(id, ret);
                    }
                },
                function(id, err){
                    return err_callback(id, err);
                });
            }
        },
        function(err){
            err_callback(id, err);
        });


    },


    // for internal use only: runs query and checks for error (not for rendering)
    // returns only data of first dataset
    _getData: function(id, connstr, password, query, callback, err_callback){
        var client = this.getInfoClient(id, connstr, password);
        client.sendQuery(query,
            function(result){
                if (result.datasets.length > 0 && result.datasets[0].resultStatus == 'PGRES_FATAL_ERROR'){
                    err_callback(result.datasets[0].resultErrorMessage);
                } else {
                    callback(result.datasets[0].data);
                }
            },
            function(err){
                err_callback(err);
            }
        );

    },

    _quoteObject: function(object){
        if (object.indexOf('.') > 0){
            var list = object.split('.');
            var quoted = list.map(function(item){return '"'+item+'"';});
            return quoted.join('.');
        } else {
            return '"'+object+'"';
        }
    },

    _unquoteString: function(str){
        if (str.indexOf('"') == 0 && str.lastIndexOf('"') == str.length - 1){
            return str.slice(1, str.length-1)
        } else {
            return str;
        }
    },

    _getCurrentUser: function(id, connstr, password, callback, err_callback){

        var client = this.getInfoClient(id, connstr, password);
        var query = "SELECT current_user;";
        client.sendQuery(query,
        function(result){
            var user = result.datasets[0].data[0][0];
            callback(user);
        },
        function(err){
            err_callback(id, err);
        });
    },

    _normalizeSearchPath: function(id, connstr, password, search_path, callback, err_callback){
        var spath = search_path.split(',');
        if (spath.indexOf('"$user"') > -1){
            this._getCurrentUser(id, connstr, password,
            function(user){
                var idx = spath.indexOf('"$user"');
                spath[idx]=user;
                if (spath.indexOf('pg_catalog') > -1){
                    callback(spath);
                } else {
                    spath.unshift('pg_catalog');
                    callback(spath);
                }
            },
            function(err){
                err_callback(id, err)
            });
        } else {
            if (spath.indexOf('pg_catalog') > -1){
                callback(spath);
            } else {
                spath.unshift('pg_catalog');
                callback(spath);
            }
        }
    },

    _getSearchPath: function(id, connstr, password, callback, err_callback){
        var self = this;
        var client = this.getInfoClient(id, connstr, password);
        var query = "SHOW search_path";
        client.sendQuery(query,
        function(result){
            var search_path = result.datasets[0].data[0][0];
            self._normalizeSearchPath(id, connstr, password, search_path,
            function(search_path){
                callback(search_path);
            },
            function(err){
                err_callback(id, err);
            });
        },
        function(err){
            err_callback(id, err);
        });
    },


    _findRelation: function(id, connstr, password, object, callback, err_callback){
        var self = this;

        var query;
        if (self.redshift){
            query = "select n.nspname, c.relname, c.relkind, \
'<not supported>' size, \
'<not supported>' total_size, \
reltuples::bigint \
from  \
pg_class c, \
pg_namespace n \
where c.oid = '"+object+"'::regclass \
and n.oid = c.relnamespace;";
        }
        else {
            query = "select n.nspname, c.relname, c.relkind, \
pg_size_pretty(pg_relation_size(c.oid)) size, \
pg_size_pretty(pg_total_relation_size(c.oid)) total_size, \
reltuples::bigint \
from  \
pg_class c, \
pg_namespace n \
where c.oid = '"+object+"'::regclass \
and n.oid = c.relnamespace;";
        }

        this._getData(id, connstr, password, query,
        function(data){
            if (data.length > 0){
                var row = data[0];
                var relation = {
                    schema: row[0],
                    relname: row[1],
                    relkind: row[2],
                    size: row[3],
                    total_size: row[4],
                    records: row[5],
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

                var get_pk = function(done){
                    self._getRelationPK(id, connstr, password, object,
                    function(pk){
                        relation.pk = pk;
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

                var get_indexes = function(done){
                    self._getRelationIndexes(id, connstr, password, object,
                    function(indexes){
                        relation.indexes = indexes;
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

                var get_foreign_keys = function(done){
                    var query = "SELECT format('%s %s', conname, pg_catalog.pg_get_constraintdef(r.oid, true)) fk FROM pg_catalog.pg_constraint r WHERE r.conrelid = '"+object+"'::regclass AND r.contype = 'f' ORDER BY 1";
                    self._getData(id, connstr, password, query,
                    function(data){
                        if (data.length > 0){
                            relation.foreign_keys = [];
                            for (var i=0; i < data.length; i++){
                                var fk = {};
                                var splitted = data[i][0].split(' FOREIGN KEY ');
                                fk.name = splitted[0];
                                splitted = splitted[1].split(' REFERENCES ');
                                fk.columns = splitted[0];
                                fk.references = splitted[1];
                                relation.foreign_keys.push(fk);
                            }
                        }
                        done();
                    },
                    err_callback);
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

                async.series([get_columns, get_pk, get_check_constraints, get_indexes, get_triggers, get_view_def, get_foreign_keys, get_sequence_info],
                function(){
                    callback(relation);
                }
                );

            } else {
                callback(null);
            }
        },
        function(err){
            console.log(err);
            callback(null); // ignore error, behave like relation not found
        });
    },

    _findProc: function(id, connstr, password, object, callback, err_callback){
        var self = this;
        this._getSearchPath(id, connstr, password,
        function(search_path){

            // rewrite search path if schema defined
            if (object.indexOf('.') > -1){
                search_path = [object.split('.')[0]];
                object = object.split('.')[1];
            }

            // find oids of functions using search_path
            var oids = [];
            var func = {};
            var error = null;

            var calls_for_oids = search_path.map(function(item){return function(done){
                if (oids.length > 0){ // skip if already found
                    done();
                    return;
                }
                var client = self.getInfoClient(id, connstr, password);

                var schema_name = self._unquoteString(item);
                var proc_name = self._unquoteString(object);

                func.schema_name = schema_name;
                func.function_name = proc_name;
                func.scripts = [];

                var query = "SELECT p.oid from \
pg_proc p, \
pg_namespace n \
where p.pronamespace = n.oid \
and n.nspname = '"+schema_name+"' \
and p.proname = '"+proc_name+"'";

                client.sendQuery(query,
                function(result){
                    oids = result.datasets[0].data;
                    // get scripts for func oids
                    if (oids.length > 0){
                        var calls_for_scripts = oids.map(function(item){return function(cb_inner){
                            var oid = item[0];

                            var client = self.getInfoClient(id, connstr, password);
                            var query = "SELECT pg_get_functiondef("+oid+")";
                            client.sendQuery(query,
                            function(result){
                                if (result.datasets[0].resultStatus == 'PGRES_FATAL_ERROR'){
                                    error = true;
                                    err_callback(id, result.datasets[0].resultErrorMessage);
                                } else {
                                    var script = result.datasets[0].data[0][0];
                                    func.scripts.push(script);
                                }
                                cb_inner();
                            },
                            function(err){
                                err_callback(id, err);
                                cb_inner();
                            });

                        }});

                        async.series(calls_for_scripts, function(){
                            if (error == null) {
                                callback(func);
                            }
                        });
                    }
                    ///
                    done();
                },
                function(err){
                    err_callback(id, err);
                });

            }});

            async.series(calls_for_oids, function(){
                if (oids.length == 0){
                    callback(null);
                }
            });
        },
        function(err){
            err_callback(id, err);
        })
    },

    _getRelationDescription: function(id, connstr, password, object, callback, err_callback){

        var client = this.getInfoClient(id, connstr, password);

        var query = "SELECT description \
FROM pg_description \
WHERE objoid = '"+object+"'::regclass \
AND objsubid = 0";

        client.sendQuery(query,
        function(result){
            var description = result.datasets[0].data[0][0];
            callback(description);
        },
        function(err){
            err_callback(id, err);
        });

    },

    _getRelationColumns: function(id, connstr, password, object, callback, err_callback){ // eslint-disable-line no-unused-vars

        var query = 'SELECT \
    a.attname "name", \
    a.atttypid::regtype "type", \
    atttypmod "max_length", \
    a.attnotnull "not_null", \
    a.atthasdef "has_default", \
    c.adsrc "default_value", \
    b.description "description" \
FROM pg_attribute a \
    LEFT JOIN pg_description b \
        ON b.objoid = a.attrelid AND b.objsubid = a.attnum \
    LEFT JOIN pg_attrdef c \
        ON c.adrelid = a.attrelid AND c.adnum = a.attnum \
WHERE a.attrelid = \''+object+'\'::regclass \
    AND a.attnum > 0 \
ORDER BY a.attnum';

        this._getData(id, connstr, password, query,
        function(data){
            var columns = [];
            for (var i=0; i<data.length; i++){
                var row = data[i];
                var column = {
                    name: row[0],
                    type: row[1],
                    max_length: row[2],
                    not_null: row[3],
                    has_default: row[4],
                    default_value: row[5],
                    description: row[6]
                };
                columns.push(column);
            }
            callback(columns);
        },
        function(err){ // ignore error
            console.log(err);
            callback([]);
        });
    },

    _getRelationPK: function(id, connstr, password, object, callback, err_callback){ // eslint-disable-line no-unused-vars

        var query = " \
SELECT conname, conindid::regclass, array_agg(b.attname ORDER BY attnum) \
FROM pg_constraint a \
JOIN pg_attribute b ON b.attrelid = a.conindid \
WHERE conrelid = '"+object+"'::regclass \
AND contype = 'p' \
GROUP BY conname, conindid;";

        this._getData(id, connstr, password, query,
        function(data){
            if (data.length == 0){
                callback(null);
            } else {
                var row = data[0];
                var pk = {
                    pk_name: row[0],
                    ind_name: row[1],
                    columns: row[2],
                };
                callback(pk);
            }
        },
        function(err){ // ignore error
            console.log(err);
            callback();
        });

    },

    _getCheckConstraints: function(id, connstr, password, object, callback, err_callback){ // eslint-disable-line no-unused-vars

        var query = " \
SELECT conname, consrc \
FROM pg_constraint \
WHERE conrelid = '"+object+"'::regclass \
AND contype = 'c'";

        this._getData(id, connstr, password, query,
        function(data){
            if (data.length == 0){
                callback(null);
            } else {
                var constraints = [];
                for (var i=0; i<data.length; i++){
                    var row = data[i];
                    constraints.push({
                        name: row[0],
                        src: row[1],
                    });
                }
                callback(constraints);
            }
        },
        function(err){ // ignore error
            console.log(err);
            callback({});
        });

    },

    _getRelationIndexes: function(id, connstr, password, object, callback, err_callback){ // eslint-disable-line no-unused-vars

        var query = " \
SELECT \
    a.indexrelid::regclass \"name\", \
    a.indisunique \"unique\", \
    d.amname \"method\", \
    array_agg(pg_get_indexdef(a.indexrelid, b.attnum, TRUE) ORDER BY b.attnum) \"fields\", \
    pg_get_expr(a.indpred, a.indrelid, TRUE) predicate, \
    pg_get_indexdef(a.indexrelid, 0, TRUE) indexdef \
FROM \
    pg_index a, \
    pg_attribute b, \
    pg_class c, \
    pg_am d \
WHERE \
        a.indrelid = '"+object+"'::regclass \
    AND NOT a.indisprimary \
    AND b.attrelid = a.indexrelid \
    AND c.OID = a.indexrelid \
    AND d.OID = c.relam \
GROUP BY a.indexrelid, a.indisunique, d.amname, a.indrelid, a.indpred";

        this._getData(id, connstr, password, query,
        function(data){
            if (data.length == 0){
                callback(null);
            } else {
                var indexes = [];
                for (var i=0; i<data.length; i++){
                    var row = data[i];
                    indexes.push({
                        name: row[0],
                        unique: row[1],
                        method: row[2],
                        columns: row[3],
                        predicate: row[4],
                        indexdef: row[5],
                    });
                }
                callback(indexes);
            }
        },
        function(err){ // ignore error
            console.log(err);
            callback([]);
        });
    },

    _getTriggers: function(id, connstr, password, object, callback, err_callback){ // eslint-disable-line no-unused-vars
            var query = " \
select t.tgname, t.oid \
from pg_trigger t, \
pg_class c \
where  \
c.oid = '"+object+"'::regclass \
and t.tgrelid = c.oid \
order by 1 \
";
            this._getData(id, connstr, password, query,
            function(data){
                if (data.length > 0){
                    var triggers = data.map(function(item){
                        return {trigger_name: item[0], oid: item[1]};
                    });
                    callback(triggers);
                } else {
                    callback(null);
                }
            },
            function(err){ // ignore error
                console.log(err);
                callback({});
            });
    },

    _getTrigger: function(id, connstr, password, trigger_oid, callback, err_callback){

        var trigger_name = null;
        var table = null;
        var script = null;

        var query = ' \
select tgname, (tgrelid::regclass)::text, pg_get_triggerdef(oid) \
from pg_trigger t \
where t.oid = '+trigger_oid;

        this._getData(id, connstr, password, query,
        function(data){
            if (data.length > 0){
                trigger_name = data[0][0];
                table = data[0][1];
                script = data[0][2];
            }

            var trigger = {
                trigger_name: trigger_name,
                table: table,
                script: script,
            };

            callback(trigger);
        },
        err_callback);

    },

    _get_db_info: function(id, connstr, password, callback, err_callback){
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
            var query = "SELECT current_database(), version()";

            self._getData(id, connstr, password, query,
            function(data){
                if (data.length > 0){
                    current_database = data[0][0];
                    version = data[0][1];
                }
                done();
            },
            err_callback);
        };

        // get schemas
        var get_schemas = function(done){
            var query = " \
SELECT nspname AS schema \
FROM pg_namespace \
ORDER BY 1 \
";
            self._getData(id, connstr, password, query,
            function(data){
                if (data.length > 0){
                    schemas = data.map(function(item){return item[0];});
                }
                done();
            },
            err_callback);
        }

        // get roles
        var get_roles = function(done){
            var query = " \
SELECT rolname AS role \
FROM pg_roles \
ORDER BY 1 \
";
            self._getData(id, connstr, password, query,
            function(data){
                if (data.length > 0){
                    roles = data.map(function(item){return item[0];});
                }
                done();
            },
            function(err){ // ignore error (redshift specific)
                console.log(err);
                done();
            });
        }

        // get databases
        var get_databases = function(done){
            var query = " \
SELECT datname AS db \
FROM pg_database \
ORDER BY 1 \
";
            self._getData(id, connstr, password, query,
            function(data){
                if (data.length > 0){
                    databases = data.map(function(item){return item[0];});
                }
                done();
            },
            err_callback);
        }

        // get tablespaces
        var get_tablespaces = function(done){
            var query = " \
SELECT spcname \
FROM pg_tablespace \
ORDER BY 1 \
";
            self._getData(id, connstr, password, query,
            function(data){
                if (data.length > 0){
                    tablespaces = data.map(function(item){return item[0];});
                }
                done();
            },
            err_callback);
        }

        // get event triggers
        var get_event_triggers = function(done){
            var query = " \
SELECT evtname \
FROM pg_event_trigger \
ORDER BY 1 \
";
            self._getData(id, connstr, password, query,
            function(data){
                if (data.length > 0){
                    event_triggers = data.map(function(item){return item[0];});
                }
                done();
            },
            function(err){ // ignore error (redshift specific)
                console.log(err);
                done()
            });
        }

        async.series([get_current_database, get_schemas, get_roles, get_databases, get_tablespaces, get_event_triggers], function(){
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

    _get_schema_info: function(id, connstr, password, schema_name, callback, err_callback){
        var self = this;
        var current_database = null;
        var tables = [];
        var functions = [];
        var views = [];
        var sequences = [];

        // get current dbname
        var get_current_database = function(done){
            var query = "SELECT current_database()";

            self._getData(id, connstr, password, query,
            function(data){
                if (data.length > 0){
                    current_database = data[0][0];
                }
                done();
            },
            err_callback);
        };

        // get tables
        var get_tables = function(done){
            var query = " \
select c.relname from \
pg_class c, \
pg_namespace n \
where n.nspname = '"+schema_name+"' \
and c.relnamespace = n.oid \
and c.relkind = 'r' \
order by 1 \
";
            self._getData(id, connstr, password, query,
            function(data){
                if (data.length > 0){
                    tables = data.map(function(item){return item[0];});
                }
                done();
            },
            err_callback);
        }

        // get functions
        var get_functions = function(done){
            var query = " \
select distinct p.proname from \
pg_proc p, \
pg_namespace n \
where \
n.nspname = '"+schema_name+"' \
and p.pronamespace = n.oid \
order by 1  \
";
            self._getData(id, connstr, password, query,
            function(data){
                if (data.length > 0){
                    functions = data.map(function(item){return item[0];});
                }
                done();
            },
            err_callback);

        }

        // get views
        var get_views = function(done){
            var query = " \
select viewname from \
pg_views \
where schemaname = '"+schema_name+"' \
order by 1";

            self._getData(id, connstr, password, query,
            function(data){
                if (data.length > 0){
                    views = data.map(function(item){return item[0];});
                }
                done();
            },
            err_callback);
        }

        // get sequences
        var get_sequences = function(done){
            var query = " \
select c.relname from \
pg_class c, \
pg_namespace n \
where n.nspname = '"+schema_name+"' \
and c.relnamespace = n.oid \
and c.relkind = 'S' \
order by 1 \
";
            self._getData(id, connstr, password, query,
            function(data){
                if (data.length > 0){
                    sequences = data.map(function(item){return item[0];});
                }
                done();
            },
            err_callback);
        }

        async.series([get_current_database, get_tables, get_functions, get_views, get_sequences], function(){
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

    getCompletionWords: function(callback){

        var query1 = "/*sqltabs*/ \
SELECT hashtext(string_agg(word, '')) FROM ( \
    SELECT DISTINCT word FROM ( \
        SELECT nspname AS word FROM pg_namespace UNION \
        SELECT relname FROM pg_class UNION \
        SELECT proname FROM pg_proc UNION \
        SELECT attname FROM pg_attribute UNION \
        SELECT name FROM pg_settings \
    ) v  ORDER BY 1 \
) w \
ORDER BY 1";

        var query2 = "/*sqltabs*/ \
SELECT DISTINCT word FROM ( \
    SELECT nspname AS word FROM pg_namespace UNION \
    SELECT relname FROM pg_class UNION \
    SELECT proname FROM pg_proc UNION \
    SELECT attname FROM pg_attribute UNION \
    SELECT name FROM pg_settings \
) v  ORDER BY 1";

        var needUpdate = {};
        var calls = [];

        for (var tab in Clients){

            if (Clients[tab].redshift){ // ignore redshift
                continue;
            }

            needUpdate[tab] = false;

            var get_words_hash = function(tab){return function(done){
                var tabClient = Clients[tab];
                var client = new PqClient(tabClient.connstr, tabClient.password, tabClient.redshift);
                client.sendQuery(query1, // get hash of words
                function(result){
                    if (result.datasets.length > 0 && result.datasets[0].resultStatus == 'PGRES_FATAL_ERROR'){ // error
                        // error ignore
                        console.log(result);
                    } else {
                        if (tab in AutocompletionHashes &&
                            result.datasets[0].data.length > 0 &&
                            AutocompletionHashes[tab] == result.datasets[0].data[0][0]
                        ) {
                            // hash hasn't changed since last update
                        } else {
                            AutocompletionHashes[tab] = result.datasets[0].data[0][0];
                            needUpdate[tab] = true;
                        }
                    }
                    client.disconnect();
                    done();
                },
                function(err){
                    console.log(err);
                    client.disconnect();
                    done();
                });
            }}(tab);

            var get_words = function(tab){return function(done){
                if (needUpdate[tab]){
                    var tabClient = Clients[tab];
                    var client = new PqClient(tabClient.connstr, tabClient.password, tabClient.redhsift);

                    client.sendQuery(query2, // get words themselves
                    function(result){
                        if (result.datasets.length > 0 && result.datasets[0].resultStatus == 'PGRES_FATAL_ERROR'){ // error
                            // error ignore
                        } else {
                            var data = result.datasets[0].data;
                            async.eachSeries(data, function(item, callback){
                                var word = item[0];
                                if (Words.indexOf(word) == -1){
                                    Words.push(word);
                                }
                                callback();
                            })
                        }
                        client.disconnect();
                        done();
                    },
                    function(err){
                        console.log(err);
                        client.disconnect();
                        done();
                    });

                } else {
                    done();
                }
            }}(tab);

            calls.push(get_words_hash);
            calls.push(get_words);
        }

        async.series(calls, function(){
            callback(Words);
        });

    },
}

module.exports = Database;
