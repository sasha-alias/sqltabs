
var dispatcher = require('./Dispatcher');
var AppDispatcher = dispatcher.AppDispatcher;
var SignalsDispatcher = dispatcher.SignalsDispatcher;

var QueryCallback = function(key, result){
    AppDispatcher.dispatch({
        eventName: 'query-finished',
        key: key,
        result: result,
    });
};

var ErrorCallback = function(key, error){
    AppDispatcher.dispatch({
        eventName: 'query-error',
        key: key,
        error: error,
    });
}

var Actions = {

    select: function(id){
        AppDispatcher.dispatch({
            eventName: 'select-tab',
            key: id
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
    }



}

module.exports = Actions;
