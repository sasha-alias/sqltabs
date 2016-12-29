var postgres = require('./connectors/postgres/Database.js');
var cassandra = require('./connectors/cassandra/Database.js');
var url = require('url');
var path = require('path');
var tunnel = require('tunnel-ssh');
var net = require('net');

var Tunnels = {};
var TunnelPorts = {};
var PortSequence = 15000;

function resolveHome(filepath) {
    if (filepath[0] === '~') {
        return path.join(process.env.HOME, filepath.slice(1));
    }
    return path;
}

var Executor = {

    getDatabase: function(id, connstr, callback, err_callback){

        var connstr_list = [];
        connstr.split("|").forEach(function(item){ // trim spaces
            connstr_list.push(item.trim());
        });

        if (connstr_list.length > 1 && connstr_list[0].startsWith('ssh://')){
            this.createTunnel(id, connstr, connstr_list, callback, err_callback);
        } else {
            callback(this._getConnector(connstr));
        }

    },

    _getConnector: function(connstr){
        if (connstr.indexOf('cassandra://') == 0){
            var db = cassandra;
        } else {
            var db = postgres;
        }
        db.connstr = connstr;
        return db;
    },

    testSSH: function(id, config, callback, err_callback){
        var client = net.connect({host: config.localHost, port: config.localPort},
            function(){callback();}
        );
        client.on('error', function(e){
            client.end();
        });
    },

    createTunnel: function(id, connstr, connstr_list, callback, err_callback){

        var self = this;
        var ssh_url = url.parse(connstr_list[0], true);
        var db_url = url.parse(connstr_list[1]);

        if (db_url.port == null){
            db_url.port = self._getConnector(connstr_list[1]).DEFAULT_PORT;
        }

        if (db_url.auth == null){
            var auth = '';
        } else {
            var auth = db_url.auth+'@'
        }

        if (db_url.path == null){
            var url_path= '';
        } else {
            var url_path = db_url.path;
        }

        try{
            if (ssh_url.query.identity_file){
                var identity_file = require('fs').readFileSync(resolveHome(ssh_url.query.identity_file));
            } else {
                var identity_file = require('fs').readFileSync(resolveHome('~/.ssh/id_rsa'));
            }
        }
        catch(e){
            identity_file = null;
        }

        if (id in Tunnels){
            console.log('reuse tunnel: '+id);
            var port = TunnelPorts[id];
            var mapped_db_url = db_url.protocol+'//'+auth+'localhost:'+port+url_path;
            return callback(self._getConnector(mapped_db_url));
        } else {
            console.log('create tunnel: '+id);
            PortSequence = PortSequence + 1;
            var mapped_db_url = db_url.protocol+'//'+auth+'localhost:'+PortSequence+url_path;
            var ssh_config = {
                username: ssh_url.auth,
                host: ssh_url.hostname,
                port: ssh_url.port,
                privateKey: identity_file,
                dstHost: db_url.hostname,
                dstPort: db_url.port,
                localHost:'127.0.0.1',
                localPort: PortSequence,
                keepAlive: true,
                readyTimeout: 30000,
            };

            var ssh_server = tunnel(ssh_config, function (error, server) {

                if (error){
                    err_callback(id, "create ssh tunnel error: "+error);
                    return;
                }
                Tunnels[id] = server;
                TunnelPorts[id] = PortSequence;

                self.testSSH(id, ssh_config, function(){
                    return callback(self._getConnector(mapped_db_url));
                }, function(){
                    err_callback(id, "ssh tunnel error");
                });
            });

            ssh_server.on('error', function(err, srv){
                self.releaseTunnel(id);
            });


        }
    },

    releaseTunnel: function(id){
        srv = Tunnels[id];
        if (typeof(srv) != 'undefined'){
            srv.close();
            srv.removeAllListeners();
            delete Tunnels[id];
            delete TunnelPorts[id];
        }
    },

    runQuery: function(id, connstr, password, query, callback, err_callback){
        this.getDatabase(id, connstr,
        function(db){
            db.runQuery(id, db.connstr, password, query, callback, err_callback);
        },
        err_callback);
    },

    cancelQuery: function(id, connstr){
        this.getDatabase(id, connstr, function(db){
            db.cancelQuery(id);
        });
    },

    getObjectInfo: function(id, connstr, password, object, callback, err_callback){
        this.getDatabase(id, connstr, function(db){
            db.getObjectInfo(id, db.connstr, password, object, callback, err_callback);
        });
    },

    runBlocks: function(id, connstr, password, blocks, callback, err_callback){
        this.getDatabase(id, connstr, function(db){
            db.runBlocks(id, db.connstr, password, blocks, callback, err_callback);
        });
    },


    testConnection: function(id, connstr, password, callback, ask_password_callback, err_callback){
        this.getDatabase(id, connstr,
        function(db){
            db.testConnection(id, db.connstr, password, callback, ask_password_callback, err_callback);
        },
        err_callback);
    },

    getCompletionWords: function(connstr, callback){
        if (connstr){
            this.getDatabase(0, connstr, function(db){
                db.getCompletionWords(callback)
            });
        } else {
            callback([]);
        }
    },
};

module.exports = Executor;

