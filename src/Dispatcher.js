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

var React = require('react');
var Dispatcher = require('flux').Dispatcher;
var TabsStore = require('./TabsStore');
var Executor = require('./Executor');
var Config = require('./Config');
var History = require('./History');
var Cloud = require('./Cloud');

var AppDispatcher = new Dispatcher();
var SignalsDispatcher = new Dispatcher();
var DBDispatcher = new Dispatcher();

SignalsDispatcher.register(function(payload){
// separate dispatcher needed to avoid parallel actions execution
    switch(payload.eventName){
        case 'execute-script':
            TabsStore.setRenderer('plain');
            TabsStore.trigger('execute-script-'+TabsStore.selectedTab);
            break;
        case 'execute-block':
            TabsStore.setRenderer('auto');
            TabsStore.trigger('execute-block-'+TabsStore.selectedTab);
            break;
        case 'execute-all':
            TabsStore.setRenderer('auto');
            TabsStore.trigger('execute-all-'+TabsStore.selectedTab);
            break;
        case 'object-info':
            TabsStore.trigger('object-info-'+TabsStore.selectedTab);
            break
        case 'editor-resize':
            TabsStore.trigger('editor-resize');
            break;
        case 'focus-editor':
            TabsStore.trigger('focus-editor-'+TabsStore.selectedTab);
            break;

    };
    return true;
});

AppDispatcher.register( function(payload) {
    switch( payload.eventName ) {
        case 'select-tab':
            if (payload.key == 0) { // select tab 0 (+) means create a new tab
                TabsStore.newTab();
                TabsStore.tmpScript = payload.script;
            } else {
                TabsStore.selectTab(payload.key);
            }
            TabsStore.trigger('change');
            break;

        case 'close-tab':
            if (typeof(payload.key) == 'undefined'){
                tab = TabsStore.selectedTab;
            } else {
                tab = payload.key;
            }
            TabsStore.closeTab(tab);
            TabsStore.trigger('change');
            break;

        case 'next-tab':
            TabsStore.nextTab();
            TabsStore.trigger('change');
            break;

        case 'previous-tab':
            TabsStore.previosTab();
            TabsStore.trigger('change');
            break;

        case 'set-theme':
            if (payload.key == 'bright'){ // brigth
                document.getElementById("theme_stylesheet").href = "css/bootstrap.bright.css";
                document.getElementById("theme_tabs_stylesheet").href = "css/tabs.bright.css";
            } else { // dark
                document.getElementById("theme_stylesheet").href = "css/bootstrap.dark.css";
                document.getElementById("theme_tabs_stylesheet").href = "css/tabs.dark.css";
            };

            TabsStore.setTheme(payload.key);
            Config.saveTheme(TabsStore.theme);
            TabsStore.trigger('change-theme');
            break;

        case 'set-mode':
            TabsStore.setMode(payload.key);
            Config.saveMode(payload.key);
            TabsStore.trigger('change-mode');
            break;
        
        case 'set-connection':
            TabsStore.setConnection(payload.key, payload.value);
            TabsStore.setPassword(payload.key, null);
            Config.saveConnHistory(TabsStore.connectionHistory);
            TabsStore.trigger('change');
            Executor.testConnection(
                payload.key, 
                payload.value, 
                TabsStore.tabs[TabsStore.selectedTab].password,
                payload.callback,
                function(){
                    TabsStore.trigger('ask-password');
                },
                function(id, err){
                    payload.err_callback(id, err);
                }
                );

            break;

        case 'set-password':
            TabsStore.setPassword(TabsStore.selectedTab, payload.password);
            Executor.testConnection(
                TabsStore.selectedTab, 
                TabsStore.getConnstr(TabsStore.selectedTab),
                TabsStore.getPassword(TabsStore.selectedTab),
                payload.callback,
                payload.err_callback,
                payload.err_callback
            );
            TabsStore.trigger('change');

        case 'run-query':
            connstr = TabsStore.getConnstr(payload.key);
            password = TabsStore.getPassword(payload.key);
            Executor.runQuery(payload.key, connstr, password, payload.query, payload.callback, payload.err_callback);
            History.push(payload.query);
            TabsStore.trigger('query-started-'+payload.key);
            break;

        case 'run-all-blocks':
            connstr = TabsStore.getConnstr(payload.key);
            password = TabsStore.getPassword(payload.key);
            Executor.runBlocks(payload.key, connstr, password, payload.blocks, payload.callback, payload.err_callback);
            History.push(payload.blocks.join('\r'));
            TabsStore.trigger('query-started-'+payload.key);
            break;

        case 'query-cancelled':
            tab = TabsStore.selectedTab;
            Executor.cancelQuery(tab);
            TabsStore.trigger('query-cancelled-'+tab);
            break;

        case 'open-file':
            TabsStore.openFile(payload.filename);
            TabsStore.trigger('open-file-'+TabsStore.selectedTab, payload.filename);
            TabsStore.trigger('change');
            break;

        case 'save-file':
            TabsStore.saveFile(payload.filename);
            TabsStore.trigger('save-file-'+TabsStore.selectedTab, payload.filename);
            TabsStore.trigger('change');
            break;

        case 'close-file':
            TabsStore.closeFile();
            TabsStore.trigger('close-file-'+TabsStore.selectedTab);
            TabsStore.trigger('change');

        case 'goto-connstr':
            TabsStore.trigger('goto-connstr-'+TabsStore.selectedTab);
            break;

        case 'set-font-size':
            TabsStore.setFontSize(payload.size);
            Config.saveFontSize(payload.size);
            document.body.style.fontSize = payload.size;
            TabsStore.trigger('font-size-changed');
            break;

        case 'toggle-find-box':
            TabsStore.searchVisible = !TabsStore.searchVisible;
            TabsStore.trigger('toggle-find-box');
            if (TabsStore.searchVisible === false){
                TabsStore.trigger('change'); // set focus to editor
            }
            break;

        case 'editor-find-next':
            TabsStore.setSearchValue(payload.value);
            TabsStore.trigger('editor-find-next');
            break;

        case 'about':
            TabsStore.trigger('about');
            break;

        case 'get-object-info':
            connstr = TabsStore.getConnstr(TabsStore.selectedTab);
            password = TabsStore.getPassword(TabsStore.selectedTab);
            Executor.getObjectInfo(TabsStore.selectedTab, connstr, password, payload.object,
                payload.callback,
                payload.err_callback
            );
            TabsStore.trigger('query-started-'+TabsStore.selectedTab);
            break;

        case 'toggle-history':
            TabsStore.trigger('toggle-history');
            break;
        
        case 'paste-history-item':
            TabsStore.setHistoryItem(payload.idx);
            TabsStore.trigger('paste-history-item-'+TabsStore.selectedTab);
            break;

        case 'reread-config':
            TabsStore.rereadConfig();
            if (TabsStore.theme == 'bright'){ // brigth
                document.getElementById("theme_stylesheet").href = "css/bootstrap.bright.css";
                document.getElementById("theme_tabs_stylesheet").href = "css/tabs.bright.css";
            } else { // dark
                document.getElementById("theme_stylesheet").href = "css/bootstrap.dark.css";
                document.getElementById("theme_tabs_stylesheet").href = "css/tabs.dark.css";
            };
            TabsStore.trigger('change-theme');
            TabsStore.trigger('change-mode');
            TabsStore.trigger('change');
            break;

        case 'share':
            var result = TabsStore.getResult(TabsStore.selectedTab);
            Cloud.share(result, payload.callback, payload.err_callback);
            TabsStore.trigger('cloud-sent');
            break;

        case 'doc-shared':
            TabsStore.setCloudDoc(payload.docid);
            TabsStore.setCloudError(null);
            TabsStore.trigger('cloud-message');
            break;

        case 'doc-shared-error':
            TabsStore.setCloudDoc(null);
            TabsStore.setCloudError(payload.error);
            TabsStore.trigger('cloud-message');
            break;

        case 'upgrade-check':
            Cloud.getVersion(payload.callback);
            break;

        case 'new-version-available':
            TabsStore.newVersion = payload.version;
            TabsStore.trigger('new-version-available');
            break;

        case 'switch-view':
            TabsStore.trigger('switch-view-'+TabsStore.selectedTab);
            break;

        case 'show-project':
            TabsStore.trigger('show-project-'+TabsStore.selectedTab);
            break;

        case 'hide-project':
            TabsStore.trigger('hide-project-'+TabsStore.selectedTab);
            break;

        case 'toggle-project':
            TabsStore.trigger('toggle-project-'+TabsStore.selectedTab);
            break;

    }
    return true; // Needed for Flux promise resolution
}); 

DBDispatcher.register(function(payload){
    switch(payload.eventName){

        case 'query-finished':
            TabsStore.setResult(payload.key, payload.result);
            TabsStore.trigger('query-finished-'+payload.key);
            break;

        case 'query-error':
            TabsStore.setError(payload.key, payload.error);
            TabsStore.trigger('query-error-'+payload.key);
            break;

        case 'object-info-received':
            TabsStore.setObjectInfo(payload.object);
            TabsStore.trigger('object-info-received-'+payload.key);
            break;
    }
    return true; // Needed for Flux promise resolution
});


module.exports = {
AppDispatcher: AppDispatcher,
SignalsDispatcher: SignalsDispatcher,
DBDispatcher: DBDispatcher,
}
