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
const firebase = require("firebase");


var Response = function(query){
    this.connector_type = 'firebase';
    this.query = query;
    this.selectPromises = [];
    this.datasets = [];
    this.duration = null;

    this.addDataset = function(select_fields, result){

        var records = [];

        var found_fields = [];
        var fields = [];

        const addField = function(field){
            if (!found_fields.includes(field)){
                found_fields.push(field);
                fields.push({"name": field, "type": ""});
            }
        }

        if (select_fields){
            result.docs.forEach( doc => {
                var record = [doc.id];
                select_fields.map( field => {
                    record.push(doc.get(field));
                    addField(field);
                })
                records.push(record);
            });
        } else {
            result.docs.forEach( doc => {
                var record = [doc.id, JSON.stringify(doc.data())];
                fields = [{"name": "id", "type": "text"}, {"name": "doc", "type": "json"}];
                records.push(record);
            });
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
    }

    this.addSelectPromise = function(promise){
        this.selectPromises.push(promise);
    };
};



const Database = {

    Clients: {},

    connect: function(id, connstr, password){

            if (id in this.Clients){
                return this.Clients[id];
            } else {

                const serviceAccount = require("/Users/sasha/test/firestore/key.json");
                const app = admin.initializeApp({
                  credential: admin.credential.cert(serviceAccount),
                  databaseURL: "https://asymmetric-moon-235317.firebaseio.com"
                });
                this.Clients[id] = app;
            }
    },



    runQuery: function(id, connstr, password, query, callback, err_callback){
        this.connect(id, connstr, password);

        const Collection = (collection_name) => {

            this.db = admin.firestore();

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
            this.select = (fields) => {
                var selectPromise = this.query.get();
                response.addSelectPromise(selectPromise);
                selectPromise
                    .then( res => {
                        response.addDataset(fields, res);
                    });
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
            var run = new Function('collection', 'response', 'console', '"use strict";\n'+query);
            run(Collection, response, sqlConsole);
            console.log(response.selectPromises.length);
            Promise.all(response.selectPromises)
                .then( () => {callback(id, [response])} )
                .catch( err => {err_callback(id, err)} );
        } catch (err){
            return err_callback(id, err);
        }

        if (response.selectPromises.length == 0){
            callback(id, [response]);
        }

    },

    testConnection: function(id, connstr, password, callback, ask_password_callback, err_callback){
        var response = new Response();
        response.consoleMessage('OK');
        callback(id, response);
    },

    getCompletionWords: function(callback){
        callback([]);
    },

};

module.exports = Database;
