var lowdb = require('lowdb');
var path = require('path');
var fs = require('fs');

var config_dir = path.join((process.env.HOME || process.env.HOMEPATH || process.env.APPDATA), '.sqltabs')
var config_path = path.join(config_dir, 'config.json')

if (!fs.existsSync(config_dir)){
    fs.mkdirSync(config_dir);
}

var db = lowdb(config_path)

if (!db.object.config){
    db.object.config = {};
}

var config = db.object.config;

var Conf = {
    saveTheme: function(theme){
        config.theme = theme;
        db.saveSync();
    },

    getTheme: function(){
        return config.theme;
    },

    saveMode: function(mode){
        config.edit_mode = mode;
        db.saveSync();
    },

    getMode: function(){
        return config.edit_mode;
    },

    saveConnHistory: function(history){
        config.conn_history = history;
        db.saveSync();
    },

    getConnHistory: function(){
        return config.conn_history;
    },

}

module.exports = Conf;
