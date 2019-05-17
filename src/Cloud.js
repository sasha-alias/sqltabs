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

var request = require('request');
var CryptoJS = require("crypto-js");

if (typeof(DEVMODE) == 'undefined'){
    var DEVMODE = true;
}

const Cloud = {

    share: function(target_server, encrypt, encryptionKey, data, callback, err_callback){
        if (target_server.indexOf('http://') == -1 && target_server.indexOf('https://') == -1){
            target_server = 'http://'+target_server;
        }

        var uri = target_server+'/api/1.0/docs';

        if (encrypt){
            data = JSON.parse(JSON.stringify(data)); // cloning data so we don't rewrite the existing instance of data
            try{
                data.forEach( response => {
                    response.datasets = CryptoJS.AES.encrypt(JSON.stringify(response.datasets), encryptionKey).toString();
                    response.query = CryptoJS.AES.encrypt(response.query, encryptionKey).toString();
                    response.encrypted = true;
                });
            } catch (e){
                return err_callback(e.message);
            }
        }

        request({
            method: 'POST',
            uri: uri,
            json: true,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(data),
            },
            function(err, res, body){
                if (err){
                    err_callback(err.message);
                    return;
                }

                if (body.status == 'error'){
                    err_callback(body.message);
                    return;
                }

                callback(body.result);
            });
    },

    getVersion: function(callback){
        if (!DEVMODE){
            request({
                method: 'GET',
                uri: 'http://www.sqltabs.com/version',
                },
                function(err, res, body){
                    if (err){
                        return; // ignore errors
                    }

                    callback(body);
                });
        } else {
            console.log("skipping check for update in devmode");
        }
    }
}
module.exports = Cloud;
