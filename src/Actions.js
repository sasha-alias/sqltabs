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


var dispatcher = require('./Dispatcher');
var AppDispatcher = dispatcher.AppDispatcher;
var SignalsDispatcher = dispatcher.SignalsDispatcher;
var DBDispatcher = dispatcher.DBDispatcher;

var QueryCallback = function(key, result){
    DBDispatcher.dispatch({
        eventName: 'query-finished',
        key: key,
        result: result,
    });
};

var ErrorCallback = function(key, error){
    DBDispatcher.dispatch({
        eventName: 'query-error',
        key: key,
        error: error,
    });
}

var ObjectInfoCallback = function(key, object){
    DBDispatcher.dispatch({
        eventName: 'object-info-received',
        key: key,
        object: object,
    });
}

var ShareErrorCallback = function(err){
    AppDispatcher.dispatch({
        eventName: 'doc-shared-error',
        error: err,
    });
}

var ShareCallback = function(docid){
    AppDispatcher.dispatch({
        eventName: 'doc-shared',
        docid: docid,
    });
}

var CheckVersion = function(version){
    var last_version = JSON.parse(version).version.split('.');
    var pkg = require('../package.json');
    var current_version = pkg.version.split('.');
    if (last_version > current_version){
        Actions.newVersionAvailable(last_version);
    }
}

var Actions = {

    select: function(id){
        AppDispatcher.dispatch({
            eventName: 'select-tab',
            key: id,
        });
    },

    newTab: function(script){
        AppDispatcher.dispatch({
            eventName: 'select-tab',
            key: 0,
            script: script,
        });
    },

    close: function(id){
        AppDispatcher.dispatch({
            eventName: 'close-tab',
            key: id,
        });
    },

    nextTab: function(){
        AppDispatcher.dispatch({
            eventName: 'next-tab'
        });
    },

    previosTab: function(){
        AppDispatcher.dispatch({
            eventName: 'previous-tab'
        });
    },

    setTheme: function(theme){
        AppDispatcher.dispatch({
            eventName: 'set-theme',
            key: theme,
        });
    },

    setMode: function(mode){
        AppDispatcher.dispatch({
            eventName: 'set-mode',
            key: mode,
        });
    },

    setConnection: function(key, value){
        AppDispatcher.dispatch({
            eventName: 'set-connection',
            key: key,
            value: value,
            callback: QueryCallback,
            err_callback: ErrorCallback,
        });
    },

    resize: function(key){
        SignalsDispatcher.dispatch({
            eventName: 'editor-resize',
            key: key,
        });
    },

    execScript: function(){ // send message to current editor to send script for execution
        SignalsDispatcher.dispatch({
            eventName: 'execute-script',
        });
    },

    execBlock: function(){
        SignalsDispatcher.dispatch({
            eventName: 'execute-block',
        });
    },

    execAll: function(){
        SignalsDispatcher.dispatch({
            eventName: 'execute-all',
        });
    },

    runQuery: function(key, query){ // sends query to db for execution 

        AppDispatcher.dispatch(
        {
            eventName: 'run-query',
            key: key,
            query: query,
            callback: QueryCallback,
            err_callback: ErrorCallback,
        }
        );
    },

    runAllBlocks: function(key, blocks){ // send all blocks to db for execution
        AppDispatcher.dispatch({
            eventName: 'run-all-blocks',
            key: key,
            blocks: blocks,
            callback: QueryCallback,
            err_callback: ErrorCallback,
        });
    },

    cancelQuery: function(){
        AppDispatcher.dispatch({
            eventName: 'query-cancelled',
        });
    },

    openFile: function(filename){
        AppDispatcher.dispatch({
            eventName: 'open-file',
            filename: filename,
        });
    },

    saveFile: function(filename){
        AppDispatcher.dispatch({
            eventName: 'save-file',
            filename: filename,
        });
    },

    closeFile: function(){
        AppDispatcher.dispatch({
            eventName: 'close-file',
        });
    },

    gotoConnstr: function(){
        AppDispatcher.dispatch({
            eventName: 'goto-connstr',
        });
    },

    setPassword: function(password){
        AppDispatcher.dispatch({
            eventName: 'set-password',
            password: password,
            callback: QueryCallback,
            err_callback: ErrorCallback,
        });
    },

    setFontSize: function(size){
        AppDispatcher.dispatch({
            eventName: 'set-font-size',
            size: size,
        });
    },

    toggleFindBox: function(){
        AppDispatcher.dispatch({
            eventName: 'toggle-find-box',
        });
    },

    editorFindNext: function(value){
        AppDispatcher.dispatch({
            eventName: 'editor-find-next',
            value: value,
        });
    },

    about: function(){
        AppDispatcher.dispatch({
            eventName: 'about',
        });
    },

    objectInfo: function(){
        SignalsDispatcher.dispatch({
            eventName: 'object-info',
        });
    },

    getObjectInfo: function(object){
        AppDispatcher.dispatch({
            eventName: 'get-object-info',
            object: object,
            callback: ObjectInfoCallback,
            err_callback: ErrorCallback,
        });
    },

    toggleHistory: function(){
        AppDispatcher.dispatch({
            eventName: 'toggle-history',
        });
    },

    pasteHistoryItem: function(idx){
        AppDispatcher.dispatch({
            eventName: 'paste-history-item',
            idx: idx,
        });
    },

    rereadConfig: function(){
        AppDispatcher.dispatch({
            eventName: 'reread-config',
        });
    },

    share: function(){
        AppDispatcher.dispatch({
            eventName: 'share',
            callback: ShareCallback,
            err_callback: ShareErrorCallback,
        });
    },

    upgradeCheck: function(){
        AppDispatcher.dispatch({
            eventName: 'upgrade-check',
            callback: CheckVersion,
        });
    },

    newVersionAvailable: function(version){
        AppDispatcher.dispatch({
            eventName: 'new-version-available',
            version: version,
        });
    },

    switchView: function(){
        AppDispatcher.dispatch({
            eventName: 'switch-view',
        });
    },

    showProject: function(){
        AppDispatcher.dispatch({
            eventName: 'show-project',
        });
    },

    hideProject: function(){
        AppDispatcher.dispatch({
            eventName: 'hide-project',
        });
    },

    toggleProject: function(){
        AppDispatcher.dispatch({
            eventName: 'toggle-project',
        });
    },

    focusEditor: function(){
        SignalsDispatcher.dispatch({
            eventName: 'focus-editor',
        });
    },

}

module.exports = Actions;
