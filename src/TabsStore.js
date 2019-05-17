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

var MicroEvent = require('microevent');
var Config = require('./Config');
var fs = require('fs');
var EOL = require('os').EOL;
var Executor = require('./Executor');

var Sequence = function(start){
    this.curval = start;
    this.nextval = function(){
        this.curval++;
        return this.curval;
    }
}

var TabSequence = new Sequence(0);

var Tab = function(id, connstr){
    this.id = id;
    this.connstr = connstr;
    this.connector_type = Executor.getConnector(connstr).connector_type;
    this.password = Config.getSecret(connstr);
    this.result = null;
    this.error = null;
    this.filename = null;
    this.searchValue = '';
    this.searchVisible = false;
    this.objectInfo = null;
    this.historyItem = 0;
    this.newVersion = null;
    this.tmpScript = null;

    this.getTitle = function(){
        if (this.filename != null){
            return this.filename;
        } else {
            if (typeof(this.connstr) != 'undefined' && this.connstr != null) {

                    if (this.connstr.indexOf('---') != -1){ // show alias
                       return '[ '+this.connstr.match(/---\s*(.*)/)[1]+' ]';
                    } else if (this.connstr.startsWith('about:')) {
                        return this.connstr[6].toUpperCase() + this.connstr.substr(7).toLowerCase()
                    } else {
                        if (this.connstr.length > 30){ // cut too long connstr
                           return '[...'+this.connstr.substr(this.connstr.length-20)+' ]';
                        } else {
                           return '[ '+this.connstr+' ]';
                        }
                    }
            }
        }
        return '';
    }
};

var _TabsStore = function(){

    this.theme = (Config.getTheme() || 'dark');
    this.mode = (Config.getMode() || 'classic');
    this.tabs = {};
    this.fontSize = (Config.getFontSize() || 'medium');
    this.order = [];
    this.selectedTab = 0;
    this.renderer = 'plain'; // plain or auto
    this.showQuery = false;
    this.sharingServer = (Config.getSharingServer() || 'share.sqltabs.com');
    this.auto_completion = (Config.getAutoCompletion() || true);

    this.connectionHistory = (Config.getConnHistory() || []);
    this.projects = (Config.getProjects() || []);
    this.completion_words = [];

    this.getAll = function(){return this.tabs;};

    this.getAllAsArray = function () {
        return this.order.map(function (key) { return this.tabs[key];}, this)
    }

    this.findIndexByProperty = function (property, value) {
        var indexOnOrder = this.getAllAsArray().findIndex(function (tab) {
            return tab[property] == value
        })
        if (indexOnOrder === -1) {
            return -1
        }
        return this.order[indexOnOrder]
    }

    this.newTab = function(connstr){
        if (typeof(connstr) === 'undefined'){
            connstr = this.getConnstr(this.selectedTab);
            if (typeof connstr === 'string' && connstr.startsWith('about:')) {
                connstr = ''
            }
        }
        var password = null;
        if (this.selectedTab > 0) {
            password = this.tabs[this.selectedTab].password;
        }

        var newid = TabSequence.nextval();
        this.tabs[newid] = new Tab(newid, connstr, password);
        this.order.push(newid);
        this.selectedTab = newid;
        return newid;
    };

    this.selectTab = function(id){
        if (id in this.tabs) {
            this.selectedTab = id;
        }
    };

    this.closeTab = function(id){
        delete this.tabs[id];
        var idx = this.order.indexOf(id);
        this.order.splice(idx, 1);
        if (id == this.selectedTab) {
            if (idx <= this.order.length-1) {
                this.selectedTab = this.order[idx];
            } else {
                this.selectedTab = this.order[idx-1];
            }
        }
    };

    this.nextTab = function(){
        if (this.order.length <= 1) {
            return;
        }
        var idx = this.order.indexOf(this.selectedTab)+1;
        if (this.order.indexOf(this.selectedTab) == this.order.length-1){
            idx = 0;
        }
        this.selectedTab = this.order[idx];
    };

    this.previosTab = function(){
        if (this.order.length <= 1) {
            return;
        }
        var idx = this.order.indexOf(this.selectedTab)-1;
        if (this.order.indexOf(this.selectedTab) == 0){
            idx = this.order.length-1;
        }
        this.selectedTab = this.order[idx];
    };

    this.setTheme = function(theme){
        this.theme = theme;
    };

    this.getEditorTheme = function(){
        if (this.theme == 'dark'){
            return 'idle_fingers';
        } else {
            return 'chrome';
        }
    };

    this.setMode = function(mode){
        this.mode = mode;
    };

    this.enableSchemaFilter = function (schemaFilter) {
        this.schemaFilter = schemaFilter;
    }

    this.setSchemaFilterMode = function (mode) {
        this.schemaFilterMode = mode;
    }

    this.setSchemaFilterRegex = function (regex) {
        this.schemaFilterRegEx = regex;
        this.schemaFilterCompiledRegEx = new RegExp(regex, 'i');
    }

    this.getEditorMode = function(){
        if (this.mode == 'vim'){
            return 'ace/keyboard/vim';
        } else {
            return '';
        }
    };

    this.setFontSize = function(size){
        this.fontSize = size;
    };

    this.getFontSize = function(){
        return this.fontSize;
    }

    this.getConnstr = function(id){
        if (id in this.tabs) {
            return this.tabs[id].connstr;
        }
    };

    this.getPassword = function(id){
        if (id in this.tabs) {
            return this.tabs[id].password;
        }
    };

    this.getSecret = function(connstr){
        return Config.getSecret(connstr);
    }

    this.setConnection = function(id, connstr){
        this.tabs[id].connstr = connstr;
        this.tabs[id].connector_type = Executor.getConnector(connstr).connector_type;

        if (connstr == null || connstr == ""){ // don't track empty connstr
            return;
        }

        var hist_idx = this.connectionHistory.indexOf(connstr);
        if (hist_idx == -1){ // add to history
            if (this.connectionHistory.length === 20){// limit history size
                this.connectionHistory.pop();
            }
            this.connectionHistory.unshift(connstr);
        } else { // shift to the beginning of history
            this.connectionHistory.splice(hist_idx, 1);
            this.connectionHistory.unshift(connstr);
        }
    };

    this.removeConnectionItem = function(connstr){
        var idx = this.connectionHistory.indexOf(connstr)
        if (idx > -1){
            this.connectionHistory.splice(idx, 1);

        }
    };

    this.setPassword = function(id, password, savePassword){
        this.tabs[id].password = password;
        var connstr = this.getConnstr(id);

        console.log(connstr, password, savePassword);

        if (savePassword){
            Config.saveSecret(connstr, password);
        } else {
            Config.saveSecret(connstr, null);
        }

        for (var key in this.tabs){ // update password in all tabs with the same connstr
            if (this.tabs[key].connstr == connstr){
                this.tabs[key].password = password;
            }
        }
    };

    this.resetPassword = function(id){
        this.tabs[id].password = null;
    }

    this.setResult = function(id, result){
        if (typeof(this.tabs[id]) != 'undefined'){
            this.tabs[id].result = result;
        }
    };

    this.getResult = function(id){
        if (id in this.tabs){
            return this.tabs[id].result;
        }
    };

    this.setError = function(id, error){
        if (id in this.tabs){
            this.tabs[id].error = error;
        }
    };

    this.getError = function(id){
        if (id in this.tabs){
            return this.tabs[id].error;
        }
    };

    this.openFile = function(filename, tabid){
        if (tabid == null){
            tabid = this.selectedTab;
        }
        this.tabs[tabid].filename = filename;
    }

    this.saveFile = function(filename){
        this.tabs[this.selectedTab].filename = filename;
    }

    this.closeFile = function(){
        this.tabs[this.selectedTab].filename = null;
    }

    this.getEditorFile = function(id){
        if (id in this.tabs){
            return this.tabs[id].filename;
        }
    };

    this.getTabByFilename = function(filename){
        for (var id in this.tabs){
            if (this.tabs[id].filename == filename){
                return Number(id);
            }
        }
        return null;
    }

    this.setRenderer = function(renderer){
        this.renderer = renderer
    }

    this.getRenderer = function(){
        return this.renderer;
    }

    this.setSearchValue = function(value){
        this.searchValue = value;
    }

    this.getSearchValue = function(){
        return this.searchValue;
    }

    this.setObjectInfo = function(object){
        this.objectInfo = object;
    }

    this.getObjectInfo = function(){
        return this.objectInfo;
    }

    this.setHistoryItem = function(idx){
        this.historyItem = idx;
    }

    this.getHistoryItem = function(){
        return this.historyItem;
    }

    this.rereadConfig = function(){
        this.theme = (Config.getTheme() || 'dark');
        this.mode = (Config.getMode() || 'classic');
        this.connectionHistory = (Config.getConnHistory() || []);
    };

    this.setCloudDoc = function(docid){
        this.cloudDoc = docid;
    };

    this.getCloudDoc = function(){
        return this.cloudDoc;
    };

    this.setCloudError = function(error){
        this.cloudError = error;
    };

    this.getCloudError = function(){
        return this.cloudError;
    };

    this.addProject = function(dirname, alias){
        this.projects.push({path: dirname, alias: alias});
        Config.saveProjects(this.projects);
    }

    this.getProjects = function(){
        return this.projects;
    }

    this.removeProject = function(idx){
        this.projects.splice(idx, 1);
        Config.saveProjects(this.projects);
    }

    this.getCompletionWords = function(){
        return this.completion_words;
    }

    this.updateCompletionWords = function(words){
        this.completion_words = words;
    }

    this.setEcho = function(boolean_echo){
        this.showQuery = boolean_echo;
        this.trigger('change-show-query')
    }

    this.exportResult = function(filename, format){
        if (format == 'json'){
            fs.writeFile(filename, JSON.stringify(this.tabs[this.selectedTab].result), function(err) {
                if(err) {
                    return console.log(err);
                }
            });
            return;
        }
        if (format == 'csv'){
            var file = fs.openSync(filename, 'w');
            for (var i = 0; i < this.tabs[this.selectedTab].result.length; i++){
                var block = this.tabs[this.selectedTab].result[i]
                for (var j = 0; j < block.datasets.length; j++){
                    var dataset = block.datasets[j];
                    // write field names
                    var field_names = [];
                    dataset.fields.forEach(function(field){
                        field_names.push('"' + field.name + '"');
                    });
                    fs.writeSync(file, field_names.join()+EOL);
                    // write records
                    dataset.data.forEach(function(record){
                        var values = []
                        record.forEach(function(col){
                            if (col != null){
                                var escaped = col.replace(/"/g, '""');
                                values.push('"' + escaped + '"');
                            } else {
                                values.push("NULL");
                            }
                        });
                        fs.writeSync(file, values.join()+EOL);
                    });
                }
            }
            return;
        }

    }

    this.getConnectionColor = function(connstr){
        if (connstr == null){
            connstr = this.getConnstr(this.selectedTab);
        }
        return Config.getConnectionColor(connstr);
    }

    this.saveConnectionColor = function(color){
        var connstr = this.getConnstr(this.selectedTab);
        Config.saveConnectionColor(connstr, color);
    }

    this.setAutocompletion = function(auto_completion){
        this.auto_completion = auto_completion;
        this.trigger('change-auto-completion');
        Config.saveAutoCompletion(auto_completion);
    }

    // restore recent connection string on startup
    if (typeof(Config.getConnHistory()) != 'undefined' && Config.getConnHistory().length > 0){
        var connstr = Config.getConnHistory()[0];
        this.newTab(connstr);
    } else {
        this.newTab();
    }

};

MicroEvent.mixin(_TabsStore);

var TabsStore = new _TabsStore();


module.exports = TabsStore;
