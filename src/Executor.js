var PqClient = require('./PqClient');

var Clients={};

var Executor = {
    runQuery: function(id, connstr, query, callback, err_callback){

        if (id in Clients && Clients[id].connstr == connstr){
            var client = Clients[id];
        } else {
            var client = new PqClient(connstr);
            Clients[id] = client;
        }

        client.sendQuery(query, 
            function(result){callback(id, result)}, 
            function(result){err_callback(id, result)}
        );

    },

    cancelQuery: function(id){
        if (id in Clients){
            Clients[id].cancel();
        }
    }
};

module.exports = Executor;


