var alasql = require('alasql');
var Words = require('./keywords.js');
var async = require('async');

var Response = function(query){
    this.connector_type = "alasql";
    this.query = query;
    this.datasets = [];
    this.start_time = performance.now();
    this.duration = null;
    var self = this;
    this.finish = function(){
        self.duration = Math.round((performance.now() - self.start_time)*1000)/1000;
    };

    this.processData = function(data){

        var getDataset = function(data){

            if (typeof(data) == 'number'){ // single command
                return {
                    nrecords: null,
                    fields: null,
                    explain: false,
                    data: null,
                    cmdStatus: "OK : "+data,
                    resultStatus: "PGRES_COMMAND_OK",
                    resultErrorMessage: null,
                };
            }

            if (typeof(data) == 'string'){ // single string result
                return {
                    nrecords: 1,
                    fields: [{name: "", type: "string"}],
                    explain: false,
                    data: [[data]],
                    cmdStatus: null,
                    resultStatus: null,
                    resultErrorMessage: null,
                };
            }

            if (Array.isArray(data) && data.length == 0) { // empty result
                return {
                    nrecords: null,
                    fields: [],
                    explain: false,
                    data: [],
                    cmdStatus: null,
                    resultStatus: null,
                    resultErrorMessage: null,
                };
            }

            if (!Array.isArray(data) && typeof(data) == 'object'){ // json object result
                return {
                    nrecords: null,
                    fields: [{name: "Object", type: "Object"}],
                    explain: false,
                    data: [[JSON.stringify(data)]],
                    cmdStatus: null,
                    resultStatus: null,
                    resultErrorMessage: null,
                };
            }

            var records = [];
            var fields = [];
            for (var rn = 0; rn < data.length; rn++){
                if (rn == 0){
                    for (var k in data[rn]){
                        fields.push({name: k, type: typeof(data[rn][k])});
                    }
                }

                var rec = [];
                for (var fn in fields){
                    var field = fields[fn].name;
                    rec.push(String(data[rn][field]));
                }
                records.push(rec);
            }

            return {
                nrecords: data.length,
                fields: fields,
                explain: false,
                data: records,
                cmdStatus: null,
                resultStatus: null,
                resultErrorMessage: null,
            };
        };

        if (typeof(data) == 'number' || typeof(data) == 'string'){ // single command
            self.datasets.push(getDataset(data));
        } else if (Array.isArray(data) && data.length == 0) { // empty result
            self.datasets.push(getDataset(data));
        } else if (Array.isArray(data) && data.length > 0 && ! Array.isArray(data[0])) { // single dataset
            self.datasets.push(getDataset(data));
        } else if (!Array.isArray(data) && typeof(data) == 'object'){ // json object
            self.datasets.push(getDataset(data));
        } else {

            for (var dn in data){
                self.datasets.push(getDataset(data[dn]));
            }

        }

    };
};

var Database = {

    testConnection: function(id, connstr, password, callback, ask_password_callback, err_callback){ // eslint-disable-line no-unused-vars
        callback(id, new Response());
    },

    runQuery: function(id, connstr, password, query, callback, err_callback){

        var response = new Response(query)

        try {
            alasql.promise(query)
            .then(function(res){
                response.finish();
                response.processData(res);
                callback(id, [response]);
            })
            .catch(function(err) {
                err_callback(id, err);
            });
        } catch(err) {
            err_callback(id, err);
        }
    },

    runBlocks: function(id, connstr, password, blocks, callback, err_callback){
        var self = this;
        var results = [];

        var calls = [];
        for (var i=0; i<blocks.length; i++){
            var call = function(block){return function(done){
                self.runQuery(id, connstr, password, block,
                function(id, result){
                    results.push(result[0]);
                    done();
                },
                function(id, err){
                    err_callback(err);
                    done();
                });

            }}(blocks[i]);
            calls.push(call);
        }

        async.series(calls, function(){
            console.log(results);
            callback(id, results);
        });
    },

    getCompletionWords: function(callback){
        callback(Words);
    },

    getObjectInfo: function(id, connstr, password, object, callback, err_callback){
        err_callback(id, "Info is not yet supported for AlaSQL");
    }
};

module.exports = Database;
