var postgres = require('./connectors/postgres/Database.js');
var cassandra = require('./connectors/cassandra/Database.js');

var Databases = {};
var AutocompletionHashes = {};

var Executor = {

    getDatabase: function(connstr){
        if (connstr.indexOf('cassandra://') == 0){
            return cassandra;
        } else {
            return postgres;
        }
        return Databases[id];
    },

    runQuery: function(id, connstr, password, query, callback, err_callback){
        var db = this.getDatabase(connstr);
        db.runQuery(id, connstr, password, query, callback, err_callback);
    },

    cancelQuery: function(id){
        if (id in Databases){
            Databases[i].cancelQuery(id);
        }
    },

    getObjectInfo: function(id, connstr, password, object, callback, err_callback){
        var db = this.getDatabase(connstr);
        db.getObjectInfo(id, connstr, password, object, callback, err_callback);
    },

    runBlocks: function(id, connstr, password, blocks, callback, err_callback){
        var db = this.getDatabase(connstr);
        db.runBlocks(id, connstr, password, blocks, callback, err_callback);
    },


    testConnection: function(id, connstr, password, callback, err_callback1, err_callback2){
        var db = this.getDatabase(connstr);
        db.testConnection(id, connstr, password, callback, err_callback1, err_callback2);
    },

    getCompletionWords: function(callback){
        var db = this.getDatabase(connstr);
        db.getCompletionWords(callback)
    },
    
};

module.exports = Executor;

