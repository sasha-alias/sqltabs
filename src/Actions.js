
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

var Actions = {

    select: function(id){
        AppDispatcher.dispatch({
            eventName: 'select-tab',
            key: id,
        });
    },

    newTab: function(){
        AppDispatcher.dispatch({
            eventName: 'select-tab',
            key: 0,
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
        AppDispatcher.dispatch({
            eventName: 'editor-resize',
            key: key,
        });
    },

    execScript: function(){ // send message to current editor to send script for execution
        SignalsDispatcher.dispatch({
            eventName: 'execute-script'
        });
    },

    execBlock: function(){
        SignalsDispatcher.dispatch({
            eventName: 'execute-block'
        })
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
    }

}

module.exports = Actions;
