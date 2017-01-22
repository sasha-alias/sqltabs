var async = require('async');
var url = require('url');
var Request = require('mssql').Request;
var Connection = require('mssql').Connection;
var Words = require('./keywords.js');

var Clients = {};
var InfoClients = {};

var parse_connstr = function(connstr){

    var parsed = url.parse(connstr);

    if (parsed.pathname != 'undefined' && parsed.pathname != null){
        var database = parsed.pathname.substring(1);
    } else {
        var database = '';
    }

    if (parsed.auth){
        var user = parsed.auth.split(':')[0];
        var password = parsed.auth.split(':')[1];
    } else {
        var user = '';
        var password = '';
    }


    var config = {
        user: user,
        password: password,
        server: parsed.hostname,
        port: parsed.port,
        options: {},
    };
    return config
}

var Response = function(query){
    self = this;
    this.query = query
    //this.block = query
    this.datasets = [];
    this.start_time = performance.now();
    this.duration = null;
    this.finish = function(){
        self.duration = Math.round((performance.now() - self.start_time)*1000)/1000;
    };

    this.addInfo = function(info){

        self.datasets.push({
            nrecords: null,
            fields: null,
            data: null,
            cmdStatus: info.message,
            resultStatus: "PGRES_COMMAND_OK",
            resultErrorMessage: null,
        });
    };

    this.processResult = function(recordsets){

        if (recordsets.length == 0){

            self.datasets.push({
                nrecords: null,
                fields: null,
                data: null,
                cmdStatus: "OK",
                resultStatus: "PGRES_COMMAND_OK",
                resultErrorMessage: null,
            });
            return;
        }

        for (rsn in recordsets){
            var data = [];
            var fields = [];

            for (cn in recordsets[rsn].columns){
                fields.push({
                    name: recordsets[rsn].columns[cn].name,
                    type: recordsets[rsn].columns[cn].type.name,
                });
            }
            for (rn in recordsets[rsn]){
                var r = [];
                for (fn in recordsets[rsn][rn]){
                    r.push(String(recordsets[rsn][rn][fn]));
                }

                data.push(r);
            }

            self.datasets.push({
                nrecords: data.length,
                fields: fields,
                data: data,
                cmdStatus: null,
                resultStatus: null,
                resultErrorMessage: null,
            });
        }
    }
}


var Database = {

    DEFAULT_PORT: 1433,

    getClient: function(id, connstr, password, cache, err_callback){
        if (typeof(cache) == "undefined"){
            cache = Clients;
        }

        if (id in cache && cache[id].connstr == connstr){
            return cache[id];
        } else {
            var config = parse_connstr(connstr);

            if (password){
                config.password = password;
            }

            var connection = new Connection(config, function(err){
                if (err){
                    err_callback(id, err);
                }
            });
            connection.connstr = connstr;
            cache[id] = connection;
            return cache[id];
        }
    },

    getInfoClient: function(id, connstr, password, err_callback){
        return this.getClient(id, connstr, password, InfoClients, err_callback);
    },

    _getData: function(id, connstr, password, query, callback, err_callback){
        var client = this.getInfoClient(id, connstr, password, err_callback);
        var request = new Request(client);

        var sendRequest = function(){
            request.query(query, function(err, recordset) {
                if (err) {
                    err_callback(id, err);
                } else {
                    callback(recordset);
                }
            });
        };

        client.on('connect', function(err){
            if (err){
                err_callback(id, err);
            } else {
                sendRequest();
            }
        });

        if (client.connected){
            sendRequest();
        }
    },

    runQuery: function(id, connstr, password, query, callback, err_callback){
        var client = this.getClient(id, connstr, password, Clients, err_callback);
        var response = new Response(query);
        var request = new Request(client);
        request.multiple = true;

        var sendRequest = function(){
            request.query(query, function(err, recordsets, rowCount ) {
                response.finish();
                if (err) {
                    err_callback(id, err);
                } else {
                    response.processResult(recordsets);
                    callback(id, [response]);
                }
            });
        };

        client.currentRequest = request;

        request.on("info", function(info){
            response.addInfo(info);
        });

        client.on('error', function(err){
            err_callback(id, err);
        });

        client.on('connect', function(err){
            if (err){
                err_callback(id, err);
            } else {
                sendRequest();
            }
        });

        if (client.connected){
            sendRequest();
        }
    },

    cancelQuery: function(id){
        if (id in Clients){
            Clients[id].currentRequest.cancel();
        }
    },

    testConnection: function(id, connstr, password, callback, ask_password_callback, err_callback){

        var config = parse_connstr(connstr);
        if (password){
            config.password = password;
        }

        var client = new Connection(config, function(err){
            if(err){
                if (err.code == "ELOGIN" && password == null){
                    ask_password_callback(id);
                } else {
                    err_callback(id, err);
                }
            } else {

                var query = "SELECT 'connected' WHERE 1=0";
                var response = new Response(query);
                var request = new Request(client);
                request.query(query, function(err, rows, rowCount) {
                    response.finish();
                    if (err) {
                        err_callback(id, err);
                    } else {
                        response.processResult([rows]);
                        response.datasets[0].fields = [{name: "connected"}];

                        client.connstr = connstr;
                        Clients[id] = client;

                        callback(id, [response]);
                    }
                });
            }
        });
    },

    getObjectInfo: function(id, connstr, password, object, callback, err_callback){
        if (object == ""){
            this.getDatabaseInfo(id, connstr, password, callback, err_callback);
        } else {
            var info = {
                connector: 'mssql',
                object_type: null,
                object: null,
                object_name: object,
            };
            callback(id, info);
        }
    },

    getCompletionWords: function(callback){

        var query = "select name from (\
    select name from sys.objects \
    union \
    select name from sys.columns \
    union \
    select name from sys.schemas \
) a \
order by name"

        this._getData(0, connstr, password, query,
        function(data){
            for (rn in data){
                var word = data[rn].name;
                if (Words.indexOf(word) == -1){
                    Words.push(word);
                }
                Words.sort();
            }
            callback(Words);
        },
        function(err){
            callback(Words);
        });

    },

    getDatabaseInfo: function(id, connstr, password, callback, err_callback){
        var self = this;
        var schemas = [];
        var getSchemas = function(done){
            self._getData(0, connstr, password, "SELECT name FROM sys.schemas ORDER BY name",
            function(data){
                for (rn in data){
                    schemas.push(data[rn].name);
                }
                done();
            },
            function(err){done();})
        }

        async.series([getSchemas], function(){
            var info = {
                connector: 'mssql',
                object_type: 'database',
                object: {
                    schemas: schemas,
                },
                object_name: null,
            };
            callback(id, info);
        })
    },
}

module.exports = Database;
