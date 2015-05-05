var React = require('react');
var Dispatcher = require('flux').Dispatcher;
var TabsStore = require('./TabsStore');
var Executor = require('./Executor');
var Config = require('./Config');

var AppDispatcher = new Dispatcher();

AppDispatcher.register( function(payload) {
    switch( payload.eventName ) {
        case 'select-tab':
            if (payload.key == 0) { // select tab 0 (+) means create a new tab
                TabsStore.newTab();
            } else {
                TabsStore.selectTab(payload.key);
            }
            TabsStore.trigger('change');
            break;

        case 'close-tab':
            TabsStore.closeTab(payload.key);
            TabsStore.trigger('change');
            break;

        case 'set-theme':
            if (payload.key == 'bright'){ // brigth
                document.getElementById("theme_stylesheet").href = "css/bootstrap.bright.css";
            } else { // dark
                document.getElementById("theme_stylesheet").href = "css/bootstrap.dark.css";
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
        
        case 'save-editor-content':
            TabsStore.saveEditorContent(payload.key, payload.value);
            break;

        case 'set-connection':
            TabsStore.setConnection(payload.key, payload.value);
            Config.saveConnHistory(TabsStore.connectionHistory);
            TabsStore.trigger('change');
            break;

        case 'editor-resize':
            TabsStore.trigger('editor-resize');
            break;

        case 'run-query':
            connstr = TabsStore.getConnstr(payload.key);
            Executor.runQuery(payload.key, connstr, payload.query, payload.callback, payload.err_callback);
            TabsStore.trigger('query-started-'+payload.key);
            break;

        case 'query-cancelled':
            Executor.cancelQuery(payload.key);
            TabsStore.trigger('query-cancelled-'+payload.key);
            break;

        case 'query-finished':
            TabsStore.setResult(payload.key, payload.result);
            TabsStore.trigger('query-finished-'+payload.key);
            break;

        case 'query-error':
            TabsStore.setError(payload.key, payload.error);
            TabsStore.trigger('query-error-'+payload.key);
            break;

        case 'open-file':
            TabsStore.openFile(payload.filename);
            TabsStore.trigger('open-file', payload.filename);
            break;

    }
    return true; // Needed for Flux promise resolution
}); 

module.exports = AppDispatcher;
