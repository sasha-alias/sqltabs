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
    saveSchemaFilter: function(newProps){
        config.schemaFilter = Object.assign({}, config.schemaFilter, newProps);
        this.saveSync();
    },

    getSchemaFilter: function(){
        return config.schemaFilter;
    },

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
        if (typeof(config.conn_history) != 'undefined'){
            return config.conn_history.filter(function(item){return item != null && item != "";});
        } else {
            return [];
        }
    },

    getFontSize: function(){
        return config.font_size;
    },

    saveFontSize: function(size){
        config.font_size = size;
        this.saveSync();
    },

    getProjects: function(){
        return config.projects;
    },

    saveProjects: function(projects){
        config.projects = projects;
        this.saveSync();
    },

    saveAutoCompletion: function(auto_completion){
        config.auto_completion = auto_completion;
        this.saveSync();
    },

    getAutoCompletion: function(){
        return config.auto_completion;
    },

    saveSecret: function(connstr, secret){
        if (typeof config.secrets == 'undefined'){
            config.secrets = {};
        }
        if (secret != null){
            config.secrets[connstr] = secret;
        } else {
            delete config.secrets[connstr];
        }
        this.saveSync();
    },

    getSecret: function(connstr){
        if (typeof config.secrets != 'undefined'){
            return config.secrets[connstr];
        }
    },

    getSharingServer: function(){
        if (config.sharing_server == "sqltabs.com" || config.sharing_server == "www.sqltabs.com"){
            return "share.sqltabs.com";
        } else {
            return config.sharing_server;
        }
    },

    saveSharingServer: function(server){
        config.sharing_server = server;
        this.saveSync();
    },

    getNoProtocolDialog: function(){
        return config.no_protocol_dialog;
    },

    saveNoProtocolDialog: function(value){
        config.no_protocol_dialog = value;
        this.saveSync();
    },

    getConnectionColor: function(connstr){
        if (typeof(config.connectionColors) == 'undefined'){
            config.connectionColors = {};
        }

        if (connstr in config.connectionColors){
            return  config.connectionColors[connstr];
        } else {
            return 'inherit';
        }

    },

    saveConnectionColor: function(connstr, color){
        if (typeof(config.connectionColors) == 'undefined'){
            config.connectionColors = {};
        }
        if (color != null) {
            config.connectionColors[connstr] = color;
        } else {
            delete config.connectionColors[connstr];
        }
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
