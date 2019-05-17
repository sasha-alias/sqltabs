/*
  Copyright (C) 2015  Aliaksandr Aliashkevich

      This program is free software: you can redistribute it and/or modify
      it under the terms of the GNU General Public License as published by
      the Free Software Foundation, either version 3 of the License, or
      (at your option) any later version.

      This program is distributed in the hope that it will be useful,
      but WITHOUT ANY WARRANTY; without even the implied warranty of
      MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
      GNU General Public License for more details.

      You should have received a copy of the GNU General Public License
      along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var postgres = require('./connectors/postgres/Database.js');
var cassandra = require('./connectors/cassandra/Database.js');
var mysql = require('./connectors/mysql/Database.js');
var mssql = require('./connectors/mssql/Database.js');
var alasql = require('./connectors/alasql/Database.js');
var firebase = require('./connectors/firebase/Database.js');
var url = require('url');
var path = require('path');
var tunnel = require('tunnel-ssh');
var net = require('net');

var Tunnels = {};
var TunnelPorts = {};
var PortSequence = 15000;

function resolveHome(filepath) {
    if (filepath.charAt(0) === '~') {
        return path.join(process.env.HOME, filepath.slice(1));
    }
    return filepath;
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
            callback(this.getConnector(connstr));
        }

    },

    getConnector: function(connstr){
        var db = postgres;
        if  (connstr == '' || connstr == null || connstr.indexOf('alasql://') == 0){
            db = alasql;
        } else if (connstr.indexOf('cassandra://') == 0){
            db = cassandra;
        } else if (connstr.indexOf('mysql://') == 0){
            db = mysql;
        } else if (connstr.indexOf('mssql://') == 0){
            db = mssql;
        } else if (connstr.indexOf('https://') == 0){
            db = firebase;
        } else if (connstr.indexOf('redshift://') == 0){
            db = postgres;
            db.redshift = true;
        }
        db.connstr = connstr;
        return db;
    },

    testSSH: function(id, config, callback, err_callback){ // eslint-disable-line no-unused-vars
        var client = net.connect({host: config.localHost, port: config.localPort},
            function(){callback();}
        );
        client.on('error', function(e){
            console.log("test ssh error: "+e);
            client.end();
        });
    },

    createTunnel: function(id, connstr, connstr_list, callback, err_callback){

        var self = this;
        var ssh_url = url.parse(connstr_list[0], true);
        var db_url = url.parse(connstr_list[1]);

        if (db_url.port == null){
            db_url.port = self.getConnector(connstr_list[1]).DEFAULT_PORT;
        }

        var auth = db_url.auth+'@'
        if (db_url.auth == null){
            auth = '';
        }

        var url_path;
        if (db_url.path == null){
            url_path= '';
        } else {
            if (db_url.path.indexOf('---') > 0){ // trim connection alias
                url_path = db_url.path.split('---')[0];
                url_path = decodeURI(url_path); // convert possible %20 etc
            } else {
                url_path = decodeURI(db_url.path);
            }
        }

        try{
            var identity_file;
            if (ssh_url.query.identity_file){
                identity_file = require('fs').readFileSync(resolveHome(ssh_url.query.identity_file));
            } else {
                identity_file = require('fs').readFileSync(resolveHome('~/.ssh/id_rsa'));
            }
        }
        catch(e){
            console.log(e);
            identity_file = null;
        }

        var mapped_db_url;
        if (id in Tunnels){
            console.log('reuse tunnel: '+id);
            var port = TunnelPorts[id];
            mapped_db_url = db_url.protocol+'//'+auth+'localhost:'+port+url_path;
            return callback(self.getConnector(mapped_db_url));
        } else {
            console.log('create tunnel: '+id);
            PortSequence = PortSequence + 1;
            mapped_db_url = db_url.protocol+'//'+auth+'localhost:'+PortSequence+url_path;
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

            if (ssh_config.username == null){
                delete ssh_config.username;
            }
            if (ssh_config.port == null){
                delete ssh_config.port;
            }
            console.log(ssh_config);

            var ssh_server = tunnel(ssh_config, function (error, server) {

                if (error){
                    console.log(error);
                    err_callback(id, "create ssh tunnel error: "+error);
                    return;
                }

                Tunnels[id] = server;
                TunnelPorts[id] = PortSequence;

                self.testSSH(id, ssh_config, function(){
                    return callback(self.getConnector(mapped_db_url));
                }, function(err){
                    console.log(err);
                    err_callback(id, "ssh tunnel error: "+err);
                });
            });

            ssh_server.on('error', function(err){
                console.log(ssh_server.config);
                err_callback(id, err);
            });


        }
    },

    releaseTunnel: function(id){
        var srv = Tunnels[id];
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

