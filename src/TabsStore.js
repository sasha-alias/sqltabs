var MicroEvent = require('microevent');
var Config = require('./Config');

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
    this.result = null;
    this.error = null;
    this.filename = null;

    this.getTitle = function(){
        if (this.filename != null){
            return this.filename;
        } else {
            return '[ '+this.connstr+' ]';
        }
    }
};

var _TabsStore = function(){

    this.theme = (Config.getTheme() || 'dark');
    this.mode = (Config.getMode() || 'classic');
    this.tabs = {};
    this.order = [];
    this.selectedTab = 0;

    this.connectionHistory = (Config.getConnHistory() || []);

    this.getAll = function(){return this.tabs;};

    this.newTab = function(connstr){

        newid = TabSequence.nextval();
        this.tabs[newid] = new Tab(newid, connstr);
        this.order.push(newid);
        this.selectedTab = newid;

    };

    this.selectTab = function(id){
        if (id in this.tabs) {
            this.selectedTab = id;
        }
    };

    this.closeTab = function(id){
        delete this.tabs[id];
        idx = this.order.indexOf(id);
        this.order.splice(idx, 1);
        if (id == this.selectedTab) {
            if (idx <= this.order.length-1) {
                this.selectedTab = this.order[idx];
            } else {
                this.selectedTab = this.order[idx-1];
            };
        };
    };

    this.nextTab = function(){
        if (this.order.length <= 1) {
            return;
        };
        if (this.order.indexOf(this.selectedTab) == this.order.length-1){
            idx = 0;
        } else {
            idx = this.order.indexOf(this.selectedTab)+1;
        };
        this.selectedTab = this.order[idx];
    };

    this.previosTab = function(){
        if (this.order.length <= 1) {
            return;
        };
        if (this.order.indexOf(this.selectedTab) == 0){
            idx = this.order.length-1;
        } else {
            idx = this.order.indexOf(this.selectedTab)-1;
        };
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
        };
    };

    this.setMode = function(mode){
        this.mode = mode;
    };

    this.getEditorMode = function(){
        if (this.mode == 'vim'){
            return 'ace/keyboard/vim';
        } else {
            return '';
        }
    };

    this.getConnstr = function(id){
        if (id in this.tabs) {
            return this.tabs[id].connstr;
        };
    };

    this.setConnection = function(id, connstr){
        this.tabs[id].connstr = connstr;

        hist_idx = this.connectionHistory.indexOf(connstr);
        if (hist_idx == -1){ // add to history
            if (this.connectionHistory.length === 20){// limit history size
                this.connectionHistory.pop();
            };
            this.connectionHistory.unshift(connstr);
        } else { // shift to the beginning of history
            this.connectionHistory.splice(hist_idx, 1);
            this.connectionHistory.unshift(connstr);
        }
    };

    this.setResult = function(id, result){
        this.tabs[id].result = result;
    };

    this.getResult = function(id){
        if (id in this.tabs){
            return this.tabs[id].result;
        };
    };

    this.setError = function(id, error){
        if (id in this.tabs){
            this.tabs[id].error = error;
        };
    };

    this.getError = function(id){
        if (id in this.tabs){
            return this.tabs[id].error;
        };
    };

    this.openFile = function(filename){
        this.tabs[this.selectedTab].filename = filename;
    }

    this.saveFile = function(filename){
        this.tabs[this.selectedTab].filename = filename;
    }

    this.getEditorFile = function(id){
        if (id in this.tabs){
            return this.tabs[id].filename;
        };
    };
        
    // restore recent connection string on startup
    if (typeof(Config.getConnHistory()) != 'undefined' && Config.getConnHistory().length > 0){
        connstr = Config.getConnHistory()[0];
        this.newTab(connstr);
    } else {
        this.newTab(); 
    }
    
};

MicroEvent.mixin(_TabsStore);  

TabsStore = new _TabsStore();


module.exports = TabsStore;
