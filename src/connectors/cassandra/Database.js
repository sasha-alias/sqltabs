var async = require('async');
var cassandra = require('cassandra-driver');
var url = require('url');

var Clients = {};

var parse_connstr = function(connstr){
    console.log(connstr);

    var parsed = url.parse(connstr);

    var keyspace = '';
    if (parsed.pathname != 'undefined' && parsed.pathname != null){
        keyspace = parsed.pathname.substring(1);
    }

    return {
        contactPoints: [parsed.host],
        keyspace: keyspace,
    }
}

function formatDate(date) {
    var month = date.getMonth() + 1;
    var day = date.getDate();
    var hour = date.getHours();
    var min = date.getMinutes();
    var sec = date.getSeconds();

    month = (month < 10 ? "0" : "") + month;
    day = (day < 10 ? "0" : "") + day;
    hour = (hour < 10 ? "0" : "") + hour;
    min = (min < 10 ? "0" : "") + min;
    sec = (sec < 10 ? "0" : "") + sec;

    var str = date.getFullYear() + "-" + month + "-" + day + " " +  hour + ":" + min + ":" + sec + ".000000";

    return str;
}

var Response = function(query){
    this.query = query
    this.datasets = [];
    this.start_time = performance.now(); //new Date().getTime();
    this.duration = null;
    var self = this;
    this.finish = function(){
        self.duration = Math.round((performance.now() - self.start_time)*1000)/1000;
    };
    this.processResult = function(result){

        if (typeof(result.rows) == 'undefined' && (typeof(result.info.warnings) == 'undefined' || result.info.warnings == null)){
            self.datasets.push({
                resultStatus: 'PGRES_COMMAND_OK',
                cmdStatus: 'OK',
            });
        }

        if (typeof(result.info.warnings) != 'undefined' && result.info.warnings != null){
            self.datasets.push({
                resultStatus: 'PGRES_NONFATAL_ERROR',
                resultErrorMessage: JSON.stringify(result.info.warnings, null, 2),
            });
        }

        var fields = []
        for (var i in result.columns){
            var col = result.columns[i];
            fields.push({
                name: col.name,
                type: cassandra.types.getDataTypeNameByCode(col.type).toUpperCase(),
            });
        }

        var records = [];
        for (var r = 0; r < result.rowLength; r++){
            var rec = [];
            for (i in fields){
                var value = result.rows[r][fields[i].name];
                if (['TEXT', 'VARCHAR', 'ASCII'].indexOf(fields[i].type) > -1){
                    rec.push(value);
                } else if (fields[i].type == 'TIMESTAMP') {
                    rec.push(formatDate(value));
                }else {
                    rec.push(JSON.stringify(value));
                }
            }
            records.push(rec);
        }
        self.datasets.push({
            nrecords: result.rowLength,
            fields: fields,
            data: records,
            cmdStatus: null,
            resultStatus: null,
            resultErrorMessage: null,
        })
    };
}

var Database = {

    DEFAULT_PORT: 9042,

    getClient: function(id, connstr){
        if (id in Clients){
            return Clients[id];
        } else {
            connstr = parse_connstr(connstr);
            var client  = new cassandra.Client(connstr);
            Clients[id] = client;
            return Clients[id];
        }
    },

    runQuery: function(id, connstr, password, query, callback, err_callback){
        var client = this.getClient(id, connstr);
        var response = new Response(query);
        client.execute(query,
        function(err, result){
            if (err){
                err_callback(id, err);
            } else {
                response.finish();
                response.processResult(result);
                callback(id, [response]);
            }
        });

    },

    _getData: function(id, connstr, password, query, callback, err_callback){

        var client = this.getClient(id, connstr);
        client.execute(query,
        function(err, result){
            if (err){
                err_callback(id, err);
            } else {
                callback(result.rows);
            }
        });

    },

    testConnection: function(id, connstr, password, callback, err_callback1, err_callback2){
        this.runQuery(id, connstr, null, "SELECT now() FROM system.local;",
            callback, err_callback2);
    },

    getCompletionWords: function(){
        return null;
    },

    getObjectInfo: function(id, connstr, password, object, callback, err_callback){

        // if no object selected then get info about database
        if (typeof(object) == 'undefined' || object == '' || object == null){
            this._getDatabaseInfo(id, connstr, password, callback, err_callback);
        }
        else if (object.slice(-1) == '.'){
            var keyspace = object.slice(0, object.length-1);
            this._getKeyspaceInfo(id, connstr, password, keyspace, callback, err_callback);
        } else {
            this._getTableInfo(id, connstr, password, object, callback, err_callback);
        }
    },

    //runBlocks: function(id, connstr, password, blocks, callback, err_callback){
    //    err_callback(id, "This functionality is not supported yet for Cassandra");
    //},

    runBlocks: function(id, connstr, password, blocks, callback, err_callback){
        var self = this;
        var results = [];

        var calls = [];
        for (var i=0; i<blocks.length; i++){
            var call = function(block){return function(done){
                self.runQuery(id, connstr, password, block,
                function(id, result){
                    results.push(result);
                    done();
                },
                function(id, err){
                    err_callback(id, err);
                    done();
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
        var cluster_name = null;
        var release_version = null;
        var keyspaces = null;
        var peers = [];

        var _err_callback = function(id, err){
                err_callback(id, JSON.stringify(err, null, 2));
        }

        var getConnection = function(done){
            self.testConnection(id, connstr, password,
            function(){
                var client = self.getClient(id, connstr);
                keyspaces = client.metadata.keyspaces;
                done();
            },
            function(err){
                _err_callback(id, err);
                done();
            });
        }

        var getPeers = function(done){
            self._getData(id, connstr, password, "SELECT peer, data_center, rack, release_version FROM system.peers",
            function(data){
                data.forEach(function(item){
                    peers.push(item);
                });
                done()
            },
            function(err){
                _err_callback(id, err);
                done();
            });
        }

        var getClusterName = function(done){
            self._getData(id, connstr, password, "SELECT cluster_name, release_version FROM system.local",
            function(data){
                cluster_name = data[0].cluster_name;
                release_version = data[0].release_version;
                done();
            },
            function(err){
                _err_callback(id, err);
                done();
            });
        }

        async.series([getPeers, getConnection, getClusterName], function(){
            var info = {
                object_type: 'cassandra_cluster',
                object: {
                    keyspaces: keyspaces,
                    peers: peers,
                    version: release_version,
                },
                object_name: cluster_name,
            }
            callback(id, info);
        })
    },

    _getKeyspaceInfo: function(id, connstr, password, keyspace, callback, err_callback){

        var self = this;

        var info = {
            object_type: 'cassandra_keyspace',
            object_name: keyspace,
            object: {
                schema_name: keyspace,
                tables: [],
                replication: {},
                cluster_name: '',
            },
        };

        var getClusterName = function(done){
            self._getData(id, connstr, password, "SELECT cluster_name FROM system.local",
            function(data){
                info.object.cluster_name = data[0].cluster_name;
                done();
            },
            err_callback);
        }


        var getTables = function(done){
            self._getData(id, connstr, password, "SELECT columnfamily_name AS table_name FROM system.schema_columnfamilies WHERE keyspace_name='"+keyspace+"'",
            function(data){
                var tables = []
                data.forEach(function(item){
                    tables.push(item.table_name);
                });
                tables = tables.sort();
                info.object.tables = tables;
                done();
            },
            err_callback)
        };

        var getStrategy = function(done){
            self._getData(id, connstr, password, "SELECT strategy_class, strategy_options FROM system.schema_keyspaces WHERE keyspace_name = '"+keyspace+"'",
            function(data){
                if (data.length > 0){
                    info.object.replication = JSON.parse(data[0].strategy_options);
                    var strategy_class = data[0].strategy_class.split('.');
                    strategy_class = strategy_class[strategy_class.length - 1];
                    info.object.replication.class = strategy_class;
                }
                done();
            },
            err_callback)
        };

        async.series([getClusterName, getTables, getStrategy], function(){
            callback(id, info);
        });
    },

    _getTableInfo: function(id, connstr, password, table, callback, err_callback){
        var self = this;
        this.testConnection(id, connstr, password,
        function(){
            var client = self.getClient(id, connstr);
            var keyspace = table.split('.')[0];
            var table_name = table.split('.')[1];
            client.metadata.getTable(keyspace, table_name,
            function(err, table_info){
                if (err) {
                    err_callback(id, err);
                } else {
                    var info = {
                        object_type: 'cassandra_table',
                        object_name: table,
                        object: table_info,
                    }
                    info.object.keyspace = keyspace;
                    // inject datatype names
                    table_info.columns.forEach(function(item, i){
                        var type = info.object.columns[i].type;
                        var typename = cassandra.types.getDataTypeNameByCode(type);
                        info.object.columns[i].typename = typename;
                    });
                    //

                    var getClusterName = function(done){
                        self._getData(id, connstr, password, "SELECT cluster_name FROM system.local",
                        function(data){
                            info.object.cluster_name = data[0].cluster_name;
                            done();
                        },
                        err_callback);
                    }

                    async.series([getClusterName], function(){
                        callback(id, info);
                    });
                }
            });
        },
        err_callback
        );
    },

}

module.exports = Database;
