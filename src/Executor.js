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
            function(result){callback(id, [result])}, 
            function(err){err_callback(id, err)}
        );

    },

    cancelQuery: function(id){
        if (id in Clients){
            Clients[id].cancel();
        }
    },

    runBlocks: function(id, connstr, password, blocks, callback, err_callback){
        var self = this;
        var current_block = 0;
        var results = [];

        var deferred_callback = function(id, result){
            results.push(result[0]); 
            if (current_block == blocks.length-1){
                callback(id, results);
            } else {
                current_block++;
                self.runQuery(id, connstr, password, blocks[current_block], deferred_callback, function(err){err_callback(id, err);});
            }
        };

        this.runQuery(id, connstr, password, blocks[current_block],
            deferred_callback,
            function(err){err_callback(id, err)}
        );
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

    _findRelation: function(id, connstr, password, object, callback, err_callback){

            var client = this.getClient(id, connstr, password);

            query = "select n.nspname, c.relname, c.relkind, \
pg_size_pretty(pg_relation_size(c.oid)) size, \
pg_size_pretty(pg_total_relation_size(c.oid)) total_size, \
reltuples \
from  \
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
                        size: row[3],
                        total_size: row[4],
                        records: row[5],
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

        var query = 'SELECT \
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

    _getRelationPK: function(id, connstr, password, object, callback, err_callback){

        var client = this.getClient(id, connstr, password);

        var query = " \
SELECT conname, conindid::regclass, array_agg(b.attname ORDER BY attnum) \
FROM pg_constraint a \
JOIN pg_attribute b ON b.attrelid = a.conindid \
WHERE conrelid = '"+object+"'::regclass \
AND contype = 'p' \
GROUP BY conname, conindid;";

        client.sendQuery(query,
        function(result){
            if (result.datasets[0].data.length == 0){
                callback(null);
            } else {
                var row = result.datasets[0].data[0];
                var pk = {
                    pk_name: row[0],
                    ind_name: row[1],
                    columns: row[2],
                };
                callback(pk);
            }
        },
        function(err){
            err_callback(id, err);
        });

    },

    _getCheckConstraints: function(id, connstr, password, object, callback, err_callback){

        var client = this.getClient(id, connstr, password);

        var query = " \
SELECT conname, consrc \
FROM pg_constraint \
WHERE conrelid = '"+object+"'::regclass \
AND contype = 'c'";

        client.sendQuery(query,
        function(result){
            if (result.datasets[0].data.length == 0){
                callback(null);
            } else {
                var constraints = [];
                for (var i=0; i<result.datasets[0].data.length; i++){
                    var row = result.datasets[0].data[i];
                    constraints.push({
                        name: row[0],
                        src: row[1],
                    });
                }
                callback(constraints);
            }
        },
        function(err){
            err_callback(id, err);
        });

    },

    _getRelationIndexes: function(id, connstr, password, object, callback, err_callback){

        var client = this.getClient(id, connstr, password);

        var query = " \
SELECT \
    a.indexrelid::regclass \"name\", \
    a.indisunique \"unique\", \
    d.amname \"method\", \
    array_agg(pg_get_indexdef(a.indexrelid, b.attnum, TRUE) ORDER BY b.attnum) \"fields\", \
    pg_get_expr(a.indpred, a.indrelid, TRUE) predicate, \
    pg_get_indexdef(a.indexrelid, 0, TRUE) indexdef \
FROM \
    pg_index a, \
    pg_attribute b, \
    pg_class c, \
    pg_am d \
WHERE \
        a.indrelid = '"+object+"'::regclass \
    AND NOT a.indisprimary \
    AND b.attrelid = a.indexrelid \
    AND c.OID = a.indexrelid \
    AND d.OID = c.relam \
GROUP BY a.indexrelid, a.indisunique, d.amname, a.indrelid, a.indpred";

        client.sendQuery(query,
        function(result){
            if (result.datasets[0].data.length == 0){
                callback(null);
            } else {
                var indexes = [];
                for (var i=0; i<result.datasets[0].data.length; i++){
                    var row = result.datasets[0].data[i];
                    indexes.push({
                        name: row[0],
                        unique: row[1],
                        method: row[2],
                        columns: row[3],
                        predicate: row[4],
                        indexdef: row[5],
                    });
                }
                callback(indexes);
            }
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

                    self._getRelationPK(id, connstr, password, object,
                    function(pk){
                        ret.object.pk = pk;

                        self._getCheckConstraints(id, connstr, password, object,
                        function(constraints){
                            ret.object.check_constraints = constraints;

                            self._getRelationIndexes(id, connstr, password, object,
                            function(indexes){
                                ret.object.indexes = indexes;

                                callback(id, ret);
                            },
                            function(err){
                                err_callback(id, err);
                            });
                        },
                        function(err){
                            err_callback(id, err);
                        });
                    },
                    function(err){
                        err_callback(id, err);
                    });
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


