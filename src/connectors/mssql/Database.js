var async = require('async');
var url = require('url');
var Words = require('./keywords.js');
var ConnectionString = require('mssql/lib/connectionstring');
var mssql = require('mssql');

var Clients = {};
var InfoClients = {};

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
    if (type == 'Date'){
        str =  date.getFullYear() + "-" + month + "-" + day;
    } else if(type == 'SmallDateTime') {
        str = date.getFullYear() + "-" + month + "-" + day + " " +  hour + ":" + min + ":" + sec;
    } else if (type == 'Time'){
        str = hour + ":" + min + ":" + sec + "." + msec;
    } else {
        str = date.getFullYear() + "-" + month + "-" + day + " " +  hour + ":" + min + ":" + sec + "." + msec;
    }

    return str;
}

var Response = function(query){
    var self = this;
    this.connector_type = "mssql";
    this.query = query;
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
            explain: false,
            data: null,
            cmdStatus: info.message,
            resultStatus: "PGRES_COMMAND_OK",
            resultErrorMessage: null,
        });
    };

    this.processResult = function(result){
        let recordsets = result.recordsets;

        if (recordsets.length == 0){

            self.datasets.push({
                nrecords: null,
                fields: null,
                explain: false,
                data: null,
                cmdStatus: "OK",
                resultStatus: "PGRES_COMMAND_OK",
                resultErrorMessage: null,
            });
            return;
        }

        for (var rsn in recordsets){
            var data = [];
            var fields = [];

            for (var cn in recordsets[rsn].columns){
                if (typeof(recordsets[rsn].columns[cn].type) != 'undefined'){
                    fields.push({
                        name: recordsets[rsn].columns[cn].name,
                        type: recordsets[rsn].columns[cn].type.name,
                    });
                } else {
                    fields.push({
                        name: recordsets[rsn].columns[cn].name,
                        type: "",
                    });
                }
            }

            for (var rn in recordsets[rsn]){
                var r = [];
                for (var fn in fields){
                    var val;
                    if (['DateTime2', 'DateTime', 'Time', 'Date', 'SmallDateTime'].indexOf(fields[fn].type) > -1){
                        val = formatDate(recordsets[rsn][rn][fields[fn].name], fields[fn].type);
                    } else {
                        val = String(recordsets[rsn][rn][fields[fn].name]);
                    }
                    r.push(val);
                }
                data.push(r);
            }

            self.datasets.push({
                nrecords: data.length,
                fields: fields,
                explain: false,
                data: data,
                cmdStatus: null,
                resultStatus: null,
                resultErrorMessage: null,
            });
        }
    }
}

var parse_connstr = function(connstr, callback){
    if (connstr.indexOf ('---')> 0) {
        connstr = connstr.split ('---') [0];
    }

    var parsed = url.parse (connstr, true);
    if (parsed.query.driver == "msnodesqlv8"){
        console.log("trying native driver");
        try{
            mssql = require("mssql/msnodesqlv8");
            const config = ConnectionString.resolve(connstr);
            callback(null, config);
        } catch (err){
            callback(err, null);
        }
    } else {
        const config = ConnectionString.resolve(connstr);
        callback(null, config);
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
            parse_connstr(connstr, function(err, config){
                if (err){
                    err_callback(id, err);
                } else {
                    if (password){
                        config.password = password;
                    }

                    var connection = new mssql.ConnectionPool(config);
                    connection.connstr = connstr;
                    connection.on('error', function(err){
                        err_callback(id, err);
                    });
                    cache[id] = connection;
                    return cache[id];
                }
            });
        }
    },

    disconnect(id, connstr){ // eslint-disable-line no-unused-vars
        if (id in Clients){
            Clients[id].close();
        }
    },

    getInfoClient: function(id, connstr, password, err_callback){
        return this.getClient(id, connstr, password, InfoClients, err_callback);
    },

    _getData: function(id, connstr, password, query, callback, err_callback){
        var client = this.getInfoClient(id, connstr, password, err_callback);
        if (typeof(client) == 'undefined'){
            return err_callback(id, 'Failed to get client');
        }
        var request = new mssql.Request(client);

        var sendRequest = function(){
            request.query(query, function(err, result) {
                if (err) {
                    err_callback(id, err);
                } else {
                    callback(result.recordset);
                }
            });
        };

        if (client.connected){
            sendRequest();
        } else {
            client.connect(function(err){
                if (err) {
                    err_callback(id, err);
                } else {
                    sendRequest();
                }
            });
        }
    },

    runQuery: function(id, connstr, password, query, callback, err_callback){
        var client = this.getClient(id, connstr, password, Clients, err_callback);
        var response = new Response(query);
        var request = new mssql.Request(client);
        request.multiple = true;

        request.on('error', function(err){
            err_callback(id, err);
        });

        var sendRequest = function(){
            request.query(query, function(err, result) {
                response.finish();
                if (err) {
                    err_callback(id, err);
                } else {
                    response.processResult(result);
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

        if (client.connected){
            sendRequest();
        } else {
            client.connect(function(err){
                if (err) {
                    err_callback(id, err);
                } else {
                    sendRequest();
                }
            });
        }
    },

    cancelQuery: function(id){
        if (id in Clients){
            Clients[id].currentRequest.cancel();
        }
    },

    testConnection: function(id, connstr, password, callback, ask_password_callback, err_callback){

        var config = ConnectionString.resolve(connstr);
        if (password){
            config.password = password;
        }

        var client = new mssql.ConnectionPool(config)
        client.connect(function(err){
            if(err){
                if (err.code == "ELOGIN" && password == null){
                    ask_password_callback(id);
                } else {
                    err_callback(id, err);
                }
            } else {

                var query = "SELECT 'connected' WHERE 1=0";
                var response = new Response(query);
                var request = new mssql.Request(client);
                request.query(query, function(err, result) {
                    response.finish();
                    if (err) {
                        err_callback(id, err);
                    } else {
                        response.processResult(result);
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

    getCompletionWords: function(callback){ // eslint-disable-line no-unused-vars

//        var query = "select name from (\
//    select name from sys.objects \
//    union \
//    select name from sys.columns \
//    union \
//    select name from sys.schemas \
//) a \
//order by name";
//
//        this._getData(0, connstr, password, query,
//        function(data){
//            for (rn in data){
//                var word = data[rn].name;
//                if (Words.indexOf(word) == -1){
//                    Words.push(word);
//                }
//                Words.sort();
//            }
//            callback(Words);
//        },
//        function(err){
            callback(Words);
//        });

    },

    getDatabaseInfo: function(id, connstr, password, callback, err_callback){ // eslint-disable-line no-unused-vars
        var self = this;
        var schemas = [];
        var getSchemas = function(done){
            self._getData(0, connstr, password, "SELECT name FROM sys.schemas ORDER BY name",
            function(data){
                for (var rn in data){
                    schemas.push(data[rn].name);
                }
                done();
            },
            function(){done();})
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
