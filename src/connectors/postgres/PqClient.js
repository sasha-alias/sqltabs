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

var pg = require('pg');
var parseConnstr = require('pg-connection-string').parse;
var util = require('util');
var url = require('url');
var now = require("performance-now")

var Client = function(connstr, password, redshift){
    var self = this;

    this.connstr = connstr;
    this.password = password;
    this.redshift = redshift;
    this._connstr = normalizeConnstr(connstr, password, self.redshift);
    this.client = new pg.Client(this._connstr);

    this.setPassword = function(password){
        if (password != self.password){
            self.connected = false;
            self.disconnect();
        }
        self.password = password;
        self._connstr = normalizeConnstr(this.connstr, password, self.redshift);
    };

    this.connected = false;

    this.callback = null;

    this.err_callback = null;

    this.finished = false;

    this.error = false;

    this.Response = null;

    this.copy_data = [];

    this.cancel = function(){

        self.query_cancelled = true;

        var xclient = new pg.Client(self._connstr);
        xclient.connect(function(err){
            if (err){
                console.log("failed to connect to cancel query: "+err);
            } else {
                console.log(self.client.processID);
                xclient.query("SELECT pg_cancel_backend($1)", [self.client.processID], function(err){
                    if (err){
                        console.log("failed to cancel query: "+err);
                    }
                    xclient.end();
                });
            }

        });
    };

    this.silentCancel = function(){
        self.client.end();
    };

    this.raiseError = function(err){
        self.error = true;
        self.finished = true;
        self.err_callback(err);
    };

    this.disconnect = function(){
        self.connected = false;
        self.client.end();
    };

    // real sending query
    this._executeQuery = function(query, callback, err_callback){
        self.Response = new Response(query)

        self.client.query({text: query, rowMode: 'array', multiResult: true}, function(err, res){
            self.isBusy = false;
            self.Response.finish();
            if (err) {
                if (self.query_cancelled){
                    self.query_cancelled = false;
                    err_callback("query cancelled by user's request");
                } else {
                    var ds = new Dataset({rows: [], fields: [], cmdStatus: ""});
                    ds.resultStatus = "PGRES_BAD_RESPONSE";
                    ds.resultErrorMessage = err.message;
                    self.Response.datasets.push(ds);
                    callback(self.Response);
                }
            } else {
                if (!Array.isArray(res)){ res = [res] }  // single dataset convert to multidataset


                res.forEach(function(r){
                    if (r.cmdStatus === null){
                        r.cmdStatus = "SELECT"; // empty query
                    }
                    ds = new Dataset(r);
                    self.Response.datasets.push(ds);
                });

                callback(self.Response);
            }
        });
    }

    // send query interface, connects first if needed
    this.sendQuery = function(query, callback, err_callback){
        self.isBusy = true;

        if (self.connected){
            self._executeQuery(query, callback, err_callback);
        } else {

            self.client.connect(function(err){
                if (err){
                    self.isBusy = false;
                    err_callback(err);
                } else {
                    self.connected = true;
                    self._executeQuery(query, callback, err_callback)
                }
            });
        }
    };

    this.noticeHandler = function(message){
        self.Response.datasets.push({
            resultStatus: 'PGRES_NONFATAL_ERROR',
            resultErrorMessage: message,
        });
    };

    this.client.on('notice', this.noticeHandler);

}

var Dataset = function(result){
    // construct dataset object from returned resultset.
    this.data = result.rows
    this.fields = result.fields
    this.explain = false;
    this.nrecords = result.rows.length;
    if (result.cmdStatus.indexOf('SELECT') > -1){
        this.resultStatus = 'PGRES_TUPLES_OK';
    } else if (result.cmdStatus.indexOf('EXPLAIN') > -1){
        this.resultStatus = 'PGRES_TUPLES_OK';
        this.explain = true;
    } else {
        this.resultStatus = 'PGRES_COMMAND_OK';
    }
    this.fields.forEach(function(item){
        item.type = decode_type(item.dataTypeID);
    });
    this.cmdStatus = result.cmdStatus;
}

var Response = function(query){
    this.connector_type = "postgres";
    this.query = query;
    this.datasets = [];
    this.start_time = now();
    this.duration = null;
    this.finish = function(){
        this.duration = Math.round((now() - this.start_time)*1000)/1000;
    }.bind(this);
}

// normalizes connect string: ensures protocol, and substitutes password, rewrite mistaken defaults etc
var normalizeConnstr = function(connstr, password, redshift){
    if (connstr){
        var meta_start = connstr.indexOf('---'); // cut sqltabs extension of connect string
        if (meta_start != -1){
            connstr = connstr.substr(0, meta_start).trim();
        }
        if (connstr.lastIndexOf('postgresql://', 0) !== 0 && connstr.lastIndexOf('postgres://', 0) !== 0 && connstr.lastIndexOf('redshift://', 0) !== 0) {
            connstr = 'postgres://'+connstr;
        }
        var parsed = url.parse(connstr);
        var params = parsed.query;
        if (parsed.query == null){
            params = "";
            if (!redshift){ // redhsift doesn't support this
                params = "application_name=sqltabs";
            }
        }
        connstr = util.format('%s//%s%s%s%s?%s',
            parsed.protocol,
            (parsed.auth == null) ? '' : parsed.auth,
            (password == null) ? '' : ':'+password,
            (parsed.host == null) ? '' : '@'+parsed.host,
            (parsed.path == null) ? '' : parsed.pathname,
            params
        );

        connstr = decodeURIComponent(connstr).trim();

        connstr = parseConnstr(connstr);
        if (connstr.database == null){
            connstr.database = connstr.user;
        }
        return connstr;
    }
};

var decode_type = function(type_code){
    var types = {
        16      :'BOOL',
        17      :'BYTEA',
        18      :'CHAR',
        19      :'NAME',
        20      :'INT8',
        21      :'INT2',
        22      :'INT2VECTOR',
        23      :'INT4',
        24      :'REGPROC',
        25      :'TEXT',
        26      :'OID',
        27      :'TID',
        28      :'XID',
        29      :'CID',
        30      :'OIDVECTOR',
        114     :'JSON',
        142     :'XML',
        194     :'PGNODETREE',
        32      :'PGDDLCOMMAND',
        600     :'POINT',
        601     :'LSEG',
        602     :'PATH',
        603     :'BOX',
        604     :'POLYGON',
        628     :'LINE',
        700     :'FLOAT4',
        701     :'FLOAT8',
        702     :'ABSTIME',
        703     :'RELTIME',
        704     :'TINTERVAL',
        705     :'UNKNOWN',
        718     :'CIRCLE',
        790     :'CASH',
        829     :'MACADDR',
        869     :'INET',
        650     :'CIDR',
        1005    :'INT2ARRAY',
        1007    :'INT4ARRAY',
        1009    :'TEXTARRAY',
        1028    :'OIDARRAY',
        1021    :'FLOAT4ARRAY',
        1033    :'ACLITEM',
        1263    :'CSTRINGARRAY',
        1042    :'BPCHAR',
        1043    :'VARCHAR',
        1082    :'DATE',
        1083    :'TIME',
        1114    :'TIMESTAMP',
        1184    :'TIMESTAMPTZ',
        1186    :'INTERVAL',
        1266    :'TIMETZ',
        1560    :'BIT',
        1562    :'VARBIT',
        1700    :'NUMERIC',
        1790    :'REFCURSOR',
        2202    :'REGPROCEDURE',
        2203    :'REGOPER',
        2204    :'REGOPERATOR',
        2205    :'REGCLASS',
        2206    :'REGTYPE',
        4096    :'REGROLE',
        4089    :'REGNAMESPACE',
        2211    :'REGTYPEARRAY',
        2950    :'UUID',
        3220    :'LSN',
        3614    :'TSVECTOR',
        3642    :'GTSVECTOR',
        3615    :'TSQUERY',
        3734    :'REGCONFIG',
        3769    :'REGDICTIONARY',
        3802    :'JSONB',
        3904    :'INT4RANGE',
        2249    :'RECORD',
        2287    :'RECORDARRAY',
        2275    :'CSTRING',
        2276    :'ANY',
        2277    :'ANYARRAY',
        2278    :'VOID',
        2279    :'TRIGGER',
        3838    :'EVTTRIGGER',
        2280    :'LANGUAGE_HANDLER',
        2281    :'INTERNAL',
        2282    :'OPAQUE',
        2283    :'ANYELEMENT',
        2776    :'ANYNONARRAY',
        3500    :'ANYENUM',
        3115    :'FDW_HANDLER',
        3310    :'TSM_HANDLER',
        3831    :'ANYRANGE',
    }

    return types[type_code];
};


module.exports = Client;
