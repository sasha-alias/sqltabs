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
        return config.conn_history.filter(function(item){return item != null && item != "";});
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
