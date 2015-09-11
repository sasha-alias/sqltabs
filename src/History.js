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

var lowdb = require('lowdb');
var path = require('path');
var fs = require('fs');

var config_dir = path.join((process.env.HOME || process.env.HOMEPATH || process.env.APPDATA), '.sqltabs')
var history_path = path.join(config_dir, 'history.json')

if (!fs.existsSync(config_dir)){
    fs.mkdirSync(config_dir);
}

var db = lowdb(history_path)

if (!db.object.history){
    db.object.history = [];
}

var history = db.object.history;

var History = {
    push: function(query){

        fs.unwatchFile(history_path);

        history.unshift({
            time: Date.now(),
            query: query,
        });
        if (history.length > 1000){
            history.pop();
        }

        db.saveSync();
        fs.watchFile(history_path, this.fileChangeHandler);
    },

    get: function(idx){
        if (idx < history.length){
            return history[idx];
        } else {
            return null;
        }
    },

    length: function(){
        return history.length;
    },

    fileChangeHandler: function(){
        // reread history from file
        var db = lowdb(history_path)
        history = db.object.history;
    },

}

fs.watchFile(history_path, History.fileChangeHandler);
    


module.exports = History;
