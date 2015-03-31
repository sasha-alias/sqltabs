/** @jsx React.DOM */
var React = require('react');
var Ace = require('brace');
var TabsStore = require('./TabsStore');
var TabActions = require('./Actions');

require('brace/mode/pgsql');
require('brace/theme/chrome');
require('brace/theme/idle_fingers');
require('brace/keybinding/vim');

var Editor = React.createClass({

    getInitialState: function(){
        return {
            theme: TabsStore.getEditorTheme(), 
            mode: TabsStore.getEditorMode()};
    },

    componentDidMount: function(){
        this.editor = Ace.edit(this.props.name);
        this.editor.getSession().setMode('ace/mode/pgsql');
        this.editor.setTheme('ace/theme/' + this.state.theme);
        this.editor.setKeyboardHandler(this.state.mode);
        TabsStore.bind('editor-resize', this.resize);
        TabsStore.bind('change-theme', this.changeHandler);
        TabsStore.bind('change-mode', this.changeHandler);

        this.editor.commands.addCommand({
            name: 'Exec',
            bindKey: {win: 'Ctrl-R',  mac: 'Command-R'},
            exec: this.execHandler,
        });

        this.editor.commands.addCommand({
            name: 'Cancel',
            bindKey: {win: 'Ctrl-B',  mac: 'Command-B'},
            exec: this.cancelHandler,
        });
    },

    componentWillUnmount: function(){
        TabsStore.unbind('editor-resize', this.resize);
        TabsStore.unbind('change-theme', this.changeTheme);
        TabsStore.unbind('change-mode', this.changeMode);
        this.editor.commands.removeCommand('Exec');
        this.editor.commands.removeCommand('Cancel');
    },

    execHandler: function(editor) {
        TabActions.runQuery(this.props.eventKey, this.editor.getValue());
    },

    cancelHandler: function(editor){
        TabActions.cancelQuery(this.props.eventKey);
    },

    changeHandler: function(){
        this.setState({
            theme: TabsStore.getEditorTheme(),
            mode: TabsStore.getEditorMode(),
        });
        this.editor.setTheme('ace/theme/' + this.state.theme);
        this.editor.setKeyboardHandler(this.state.mode);
        this.editor.resize();
    },

    resize: function(){
        this.editor.resize();
    },

    render: function(){
        return (
            <div id={this.props.name} mode={this.state.mode}/>
        );
    },
});

module.exports= Editor;
