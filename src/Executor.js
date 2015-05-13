var PqClient = require('./PqClient');

var Clients={};

var Executor = {

    getClient: function(id, connstr, password){

        if (id in Clients && Clients[id].connstr == connstr){
            var client = Clients[id];
            client.setPassword(password);
        } else {
            var client = new PqClient(connstr, password);
            Clients[id] = client;
        }
        return client;
    },

    runQuery: function(id, connstr, password, query, callback, err_callback){
        var client = this.getClient(id, connstr, password);
        client.sendQuery(query, 
            function(result){callback(id, result)}, 
            function(err){err_callback(id, err)}
        );

    },

    cancelQuery: function(id){
        if (id in Clients){
            Clients[id].cancel();
        }
    },

    testConnection: function(id, connstr, password, callback, err_callback1, err_callback2){

        var client = this.getClient(id, connstr, password);

        client.sendQuery("select version()", 
            function(result){
                callback(id, result);
            }, 
            function(err){
                if (err.message.indexOf("no password supplied")>-1){
                    err_callback1(id, err);
                } else {
                    err_callback2(id, err);
                }
            }
        );
    },

    
};

module.exports = Executor;


