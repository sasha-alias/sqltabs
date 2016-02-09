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

var PQ = require('libpq');
var util = require('util');
var url = require('url');


var Client = function(connstr, password){
    var self = this;

    // connection string
    this.connstr = connstr;
    this.password = password;
    this._connstr = normalizeConnstr(connstr, password);

    this.setPassword = function(password){
        if (password != this.password){
            this.disconnect();
        }
        this.password = password;
        this._connstr = normalizeConnstr(this.connstr, password);
    };

    // libpq instance
    this.pq = new PQ();

    this.connected = false;

    this.callback = null;

    this.err_callback = null;

    this.finished = false;

    this.error = false;

    this.Response = null;

    this.copy_data = [];

    this.cancel = function(){
        return self.pq.cancel();
    };

    this.silentCancel = function(){
        self.callback = function(){};
        self.cancel();
        self.disconnect();
    };

    this.isBusy = function(){
        return self.pq.isBusy();
    };

    this.raiseError = function(err){
        self.error = true;
        self.finished = true;
        //self.pq.removeListener('readable', self.readyHandler);
        self.pq.stopReader();
        self.err_callback(err);
    };

    this.disconnect = function(){
        self.connected = false;
        self.pq.finish();
    };

    // send query for execution
    this.sendQuery = function(query, callback, err_callback){
        self.pq.setNonBlocking(true);

        self.Response = new Response(query);
        self.finished = false;
        self.error = false;

        self.callback = callback;
        self.err_callback = err_callback;

        var send = function(){
            self.pq.addListener('readable', self.readyHandler);
            var sent = self.pq.sendQuery(query);
            if (!sent){
                return self.raiseError(self.pq.errorMessage());
            }
            self.pq.startReader();
        }

        if (!self.connected){
            self.pq.connect(self._connstr, function(err) {
                if (err){
                    return self.raiseError(err);
                }
                self.connected = true;
                send();
            });
        } else {
            send();
        }
    };

    this.noticeHandler = function(message){
        self.Response.datasets.push({
            resultStatus: 'PGRES_NONFATAL_ERROR', 
            resultErrorMessage: message,
        });
    };

    // query is ready to return data, so read data from server
    this.readyHandler = function(){
        self._read();
    };

    this.dataReady = function(){
        if (!self.error){
            self.finished = true;
            self.pq.removeListener('readable', self.readyHandler);
            self.pq.stopReader();
            self.callback(self.Response);
        }
    }

    // extract data from server
    this._read = function(){

        if (self.pq.socket() == -1){
            self.connected = false;
            self.raiseError("Connection was terminated. Try to restart query.");
        }

        self.pq.consumeInput();

        if (self.pq.resultStatus() == 'PGRES_COPY_OUT'){
            var copy_data = self.pq.getCopyData();
            if (copy_data == -1) { // COPY completed
                var copy_dataset = this.convert_copy_buffer(self.copy_data);
                self.copy_data = []; // reset buffer
            } else {
                self.copy_data.push(copy_data.toString('utf8'));
                setTimeout(function(){
                    if (!self.finished){
                        self._read();
                    }
                }, 5);
                return;
            }
            //self.raiseError("COPY command is not supported yet");
        }

        if (self.pq.isBusy()){ // give it a moment, so not to block while fetching data
            setTimeout(function(){
                if (!self.finished){
                    self._read();
                }
            }, 100);
            return;
        } 

        var res = self.pq.getResult();

        if (!res){ // no more result sets
            self.finished = true;
            self.Response.finish();
            self.dataReady();
            return;
        }

        var nrows = self.pq.ntuples();
        var nfields = self.pq.nfields();
        var fields = [];
        for (i = 0; i<nfields; i++){
            fields.push({
                name: self.pq.fname(i),
                type: decode_type(self.pq.ftype(i)),
            });
        }
        var records = [];
        for (r = 0; r < nrows; r++){
            rec = [];
            for (f = 0; f < nfields; f++){
                if (self.pq.getisnull(r, f)){
                    v = null;
                } else {
                    v = self.pq.getvalue(r, f);
                }
                rec.push(v);
            }
            records.push(rec);
        }

        self.Response.datasets.push({
            nrecords: nrows, 
            fields: fields, 
            data: records, 
            cmdStatus: self.pq.cmdStatus(),
            resultStatus: self.pq.resultStatus(),
            resultErrorMessage: self.pq.resultErrorMessage(),
        });

        if (!self.finished){
            self._read();
        }
    }

    this.pq.on('notice', this.noticeHandler);

    this.convert_copy_buffer = function(buffer){
        // converts buffer stream gotten from COPY into resultset
        return null;
    }

}

var Response = function(query){
    this.query = query
    this.datasets = [];
    this.start_time = performance.now(); //new Date().getTime();
    this.duration = null;
    self = this;
    this.finish = function(){
        self.duration = Math.round((performance.now() - self.start_time)*1000)/1000; 
    };
}

// normalizes connect string: ensures protocol, and substitutes password
var normalizeConnstr = function(connstr, password){
    if (connstr){
        var meta_start = connstr.indexOf('---'); // cut sqltabs extension of connect string
        if (meta_start != -1){
            connstr = connstr.substr(0, meta_start).trim();
        }
        if (connstr.lastIndexOf('postgresql://', 0) !== 0 && connstr.lastIndexOf('postgres://', 0) !== 0) {
            connstr = 'postgres://'+connstr;
            parsed = url.parse(connstr);
            if (parsed.query == null){
                var params = "application_name=sqltabs";
            } else {
                var params = parsed.query;
            }
            connstr = util.format('%s//%s%s%s%s?%s',
                parsed.protocol,
                parsed.auth,
                (password == null) ? '' : ':'+password,
                (parsed.host == null) ? '' : '@'+parsed.host,
                (parsed.path == null) ? '' : parsed.pathname,
                params
            );
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
