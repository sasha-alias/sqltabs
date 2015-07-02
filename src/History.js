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
        history.unshift({
            time: Date.now(),
            query: query,
        });
        if (history.length > 1000){
            history.pop();
        }
        db.save();
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

}

module.exports = History;
