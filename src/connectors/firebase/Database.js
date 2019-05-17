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

const admin = require("firebase-admin");
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

var Response = function(query){
    this.connector_type = 'firebase';
    this.query = query;
    this.selectPromises = [];
    this.datasets = [];
    this.duration = null;
    this.start_time = performance.now();
    this.finish = function(){
        this.duration = Math.round((performance.now() - this.start_time)*1000)/1000;
        return this;
    };

    this.resolveReference = async function(val){
        return val.get();
    };

    this.resolveDocumentReferences = async docdata => {
        // recorsively scans document and replaces the references with their actual values
        var resolved = {};
        for (const key of Object.keys(docdata)){
            const original_value = docdata[key];
            var value = null;
            if (original_value != null && original_value.constructor.name == 'DocumentReference'){
                const valdoc = await original_value.get();
                value = await this.resolveDocumentReferences(valdoc.data());
            } else {
                value = original_value;
            }
            resolved[key] = value;
        }
        return resolved;
    };

    this.addDataset = async function(select_fields, result){

        var records = [];

        var fields = [{name: "id", type: ""}];

        var record;
        if (select_fields.length > 0){ // when defined fields to select

            select_fields.forEach( item =>{
                fields.push({name: item, type: ""});
            });

            for (const doc of result.docs) {
                record = [doc.id];
                for (const [fi, item] of select_fields.entries()){ // eslint-disable-line no-unused-vars

                    var v = doc.get(item);
                    const valtype = typeof v;

                    var val = String(v);
                    if (valtype  == 'object'){
                        if (v != null && v.constructor.name == 'DocumentReference'){
                            v = await v.get();
                            v = await this.resolveDocumentReferences(v.data());
                        }
                        val = JSON.stringify(v, null, 2);
                    }
                    record.push(val);
                }
                records.push(record);
            }
        } else { // when select with no fields argument

            for (const doc of result.docs){
                var resolved_doc = await this.resolveDocumentReferences(doc.data());
                record = [doc.id, JSON.stringify(resolved_doc)];
                fields = [{name: "id", type: ""}, {name: "doc", type: "json"}];
                records.push(record);
            }
        }

        this.datasets.push({
            data: records,
            nrecords: records.length,
            fields: fields,
        });
    };

    this.consoleMessage = function(...args){
        this.datasets.push({
            nrecords: null,
            fields: null,
            explain: false,
            data: [],
            cmdStatus: args.join(" "),
            resultStatus: "PGRES_COMMAND_OK",
            resultErrorMessage: null,
        });
    };

    this.addSelectPromise = function(promise){
        this.selectPromises.push(promise);
        return promise
    };
};



const Database = {

    connector_type: 'firebase',

    Clients: {},

    connect: function(id, connstr, password){

        if (connstr.indexOf ('---')> 0) {
            connstr = connstr.split ('---') [0];
        }

        if (password == null){
            throw "Service Account file can't be empty";
        }

        if (id in this.Clients){
            return this.Clients[id];
        } else {
            const serviceAccount = require(password);
            const app = admin.initializeApp({
              credential: admin.credential.cert(serviceAccount),
              databaseURL: connstr,
            }, "sqltabs"+id);

            this.Clients[id] = app;
            return this.Clients[id];
        }
    },



    runQuery: async function(id, connstr, password, query, callback, err_callback){
        try {
            var app = this.connect(id, connstr, password);
        } catch(err) {
            return err_callback(id, "Failed to connect: "+err);
        }

        const Collection = (collection_name) => {

            this.db = app.firestore();

            this.collectionRef = this.db.collection(collection_name);

            // query used in select method
            this.query = this.collectionRef;

            // transfer collectionRef properties
            this.id = this.collectionRef.id;
            this.firestore = this.collectionRef.firestore;
            this.parent = this.collectionRef.parent;
            this.path = this.collectionRef.path;

            // transfer collectionRef methods
            this.doc = this.collectionRef.doc.bind(this.collectionRef);
            this.add = this.collectionRef.add.bind(this.collectionRef);

            // transfer query methods
            this.endAt = (...args)=>{
                this.query = this.query.endAt(...args);
                return this;
            };
            this.endBefore = (...args)=>{
                this.query = this.query.endBefore(...args);
                return this;
            };

            this.get = (...args)=>{
                this.query = this.query.get(...args);
                return this;
            };
            this.isEqual = (...args)=>{
                this.query.isEqual(...args);
                return this;
            };
            this.limit = (...args)=>{
                this.query = this.query.limit(...args);
                return this;
            };
            this.onSnapshot = (...args)=>{
                this.query = this.query.onSnapshot(...args);
                return this;
            };
            this.orderBy = (...args)=>{
                this.query.orderBy(...args);
                return this;
            };
            this.where = function(...args){
                this.query = this.query.where(...args);
                return this;
            }

            // select method for displaying collection in SQL console
            // it must be defined as synced function since we can't wait for dynamic promises within user's scripts
            this.select = (...select_fields) => {
                response.addSelectPromise(
                    this.query.get()
                        .then( async res => {
                            await response.addDataset(select_fields, res);
                        })
                        .catch( err => {
                            console.log(err);
                        })
                )
                return this;
            }

            return this;
        };

        // overwrite console for the running script
        // for displaying messages in the output
        var sqlConsole = {
            log: (...args) => {
                console.log(...args);
                response.consoleMessage(...args);
            },
        };

        try {
            var response = new Response(query);
            var run = new AsyncFunction('collection', 'response', 'console', '"use strict";\n'+query);

            await run(Collection, response, sqlConsole);

            Promise.all(response.selectPromises)
                .then( () => {
                    callback(id, [response.finish()])
                })
                .catch( err => { err_callback(id, err)} );
        } catch (err){
            return err_callback(id, err);
        }

        if (response.selectPromises.length == 0){
            callback(id, [response.finish()]);
        }

    },

    testConnection: function(id, connstr, password, callback, ask_password_callback, err_callback){ // eslint-disable-line no-unused-vars
        try{
            this.connect(id, connstr, password);
        } catch(err){
            return ask_password_callback(id, err);
        }
        var response = new Response('');
        response.consoleMessage('Connection set with service file '+password);
        callback(id, [response.finish()]);
    },

    getCompletionWords: function(callback){
        callback([]);
    },

    getObjectInfo: function(id, connstr, password, object, callback, err_callback){
        var app = this.connect(id, connstr, password);
        var db = app.firestore();

        db.getCollections()
        .then( collections => {
            collections = collections.map( item => { return item.id });
            var info = {
                connector: 'firebase',
                object_type: 'database',
                object: {
                    collections: collections,
                },
                object_name: null,
            };
            callback(id, info);
        })
        .catch( err => {
            err_callback(id, err);
        });
    }
};

module.exports = Database;
