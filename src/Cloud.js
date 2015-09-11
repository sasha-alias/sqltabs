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

Cloud = {
    share: function(data, callback, err_callback){
        request({
            method: 'POST',
            uri: 'http://www.sqltabs.com/api/1.0/docs',
            json: true,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(data),
            },
            function(err, res, body){
                if (err){
                    err_callback(err);
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
    }
}
module.exports = Cloud;
