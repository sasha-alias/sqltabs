
var AppDispatcher = require('./Dispatcher')

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

    setTheme: function(theme){
        AppDispatcher.dispatch({
            eventName: 'set-theme',
            key: theme,
        });
    },

    saveEditorContent: function(key, value){
        AppDispatcher.dispatch({
            eventName: 'save-editor-content',
            key: key,
            value: value,
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

    runQuery: function(key, query){

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

    cancelQuery: function(key){
        AppDispatcher.dispatch({
            eventName: 'query-cancelled',
            key: key,
        });
    },

}

module.exports = Actions;
