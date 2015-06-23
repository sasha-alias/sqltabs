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

    _getCurrentUser: function(id, connstr, password, callback, err_callback){
        
        var client = this.getClient(id, connstr, password);
        query = "SELECT current_user;";
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
                idx = spath.indexOf('$user');
                spath[idx]=user;
                if (spath.indexOf('pg_catalog') > -1){
                    callback(spath);
                } else {
                    callback(spath.unshift('pg_catalog'));
                }
            }, 
            function(err){
                err_callback(id, err)
            });
        } else {
            if (spath.indexOf('pg_catalog') > -1){
                callback(spath);
            } else {
                callback(spath.unshift('pg_catalog'));
            }
        }
    },

    _getSearchPath: function(id, connstr, password, callback, err_callback){
        var self = this;
        var client = this.getClient(id, connstr, password);
        query = "SHOW search_path";
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

            var client = this.getClient(id, connstr, password);

            query = "select n.nspname, c.relname, c.relkind from  \
pg_class c, \
pg_namespace n \
where c.oid = '"+object+"'::regclass \
and n.oid = c.relnamespace;";

            client.sendQuery(query, 
            function(result){
                if (result.datasets[0].data.length > 0){
                    var row = result.datasets[0].data[0];
                    var relation = {
                        schema: row[0],
                        relname: row[1],
                        relkind: row[2],
                    };
                    callback(relation);
                } else {
                    callback(null);
                }
            }, 
            function(err){
                err_callback(id, err);
            });
    },

    _getRelationDescription: function(id, connstr, password, object, callback, err_callback){

        var client = this.getClient(id, connstr, password);

        query = "SELECT description \
FROM pg_description \
WHERE objoid = '"+object+"'::regclass \
AND objsubid = 0";

        client.sendQuery(query, 
        function(result){
            description = result.datasets[0].data[0][0];
            callback(description);
        }, 
        function(err){
            err_callback(id, err);
        });

    },

    _getRelationColumns: function(id, connstr, password, object, callback, err_callback){

        var client = this.getClient(id, connstr, password);

        query = 'SELECT \
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

        client.sendQuery(query, 
        function(result){
            columns = [];
            for (var i=0; i<result.datasets[0].data.length; i++){
                var row = result.datasets[0].data[i];
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
        function(err){
            err_callback(id, err);
        });
    },

    getObjectInfo: function(id, connstr, password, object, callback, err_callback){

        var self = this;

        if (typeof(object) == 'undefined' || object == '' || object == null){
            var ret = {object_type: null, object: null, object_name: object};
            callback(id, ret);
            return;
        }

        self._findRelation(id, connstr, password, object,
        function(relation){
            var ret = {object_type: "relation", object: relation, object_name: object};

            if (relation != null){
                self._getRelationColumns(id, connstr, password, object,
                function(columns){
                    ret.object.columns = columns;
                    callback(id, ret);
                },
                function(id, err){
                    err_callback(id, err);
                });
            } else {
                callback(id, ret);
            }
        },
        function(err){
            err_callback(err);
        });


    },
    
};

module.exports = Executor;


