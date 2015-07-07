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
        this.saveSync();
    },

    getTheme: function(){
        return config.theme;
    },

    saveMode: function(mode){
        config.edit_mode = mode;
        this.saveSync();
    },

    getMode: function(){
        return config.edit_mode;
    },

    saveConnHistory: function(history){
        config.conn_history = history;
        this.saveSync();
    },

    getConnHistory: function(){
        return config.conn_history;
    },

    getFontSize: function(){
        return config.font_size;
    },

    saveFontSize: function(size){
        config.font_size = size;
        this.saveSync();
    },

    saveSync: function(){
        fs.unwatchFile(config_path);
        db.saveSync();
        fs.watchFile(config_path, this.fileChangeHandler)
    },

    fileChangeHandler: function(){
        var db = lowdb(config_path);
        config= db.object.config;
        var Actions = require('./Actions');
        Actions.rereadConfig();
    },

}

module.exports = Conf;
