/** @jsx React.DOM */
var React = require('react');
var Ace = require('brace');
var TabsStore = require('./TabsStore');
var TabActions = require('./Actions');
var fs = require('fs');

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
        TabsStore.bind('change', this.changeHandler);
        TabsStore.bind('editor-resize', this.resize);
        TabsStore.bind('change-theme', this.changeHandler);
        TabsStore.bind('change-mode', this.changeHandler);
        TabsStore.bind('open-file-'+this.props.eventKey, this.fileOpenHandler);
        TabsStore.bind('save-file-'+this.props.eventKey, this.fileSaveHandler);
        TabsStore.bind('execute-script-'+this.props.eventKey, this.execHandler);
        TabsStore.bind('execute-block-'+this.props.eventKey, this.execBlockHandler);

        this.editor.getSelectedText = function() { 
            return this.session.getTextRange(this.getSelectionRange());
        }
        this.editor.focus();
    },

    componentWillUnmount: function(){
        TabsStore.unbind('change', this.changeHandler);
        TabsStore.unbind('editor-resize', this.resize);
        TabsStore.unbind('change-theme', this.changeTheme);
        TabsStore.unbind('change-mode', this.changeMode);
        TabsStore.unbind('open-file-'+this.props.eventKey, this.fileOpenHandler);
        TabsStore.unbind('save-file-'+this.props.eventKey, this.fileSaveHandler);
        TabsStore.unbind('execute-script-'+this.props.eventKey, this.execHandler);
        TabsStore.unbind('execute-block-'+this.props.eventKey, this.execBlockHandler);
    },

    execHandler: function(editor) {
        var selected = this.editor.getSelectedText();
        if (selected) {
            var script = selected;
        } else {
            var script = this.editor.getValue();
        }
        TabActions.runQuery(this.props.eventKey, script);
    },

    execBlockHandler: function(){
        var selected = this.editor.getSelectedText()
        if (selected) {
            var script = selected;
        } else {
            var current_line = this.editor.selection.getCursor().row;
            var script = this.detectBlock(current_line, this.editor.getValue);
        }
        TabActions.runQuery(this.props.eventKey, script);

    },

    detectBlock: function(current_line, script){
        var meta = '^\s*---\s*.*';
        var start = 0;
        var start_found = false;
        while (!start_found){
            current_line_text = this.editor.session.getLine(current_line).trim();
            if (current_line === 0) {
                start = current_line;
                start_found = true;
            } else if (current_line_text.match(meta) != null){
                start = current_line;
                start_found = true;
            } 
            current_line--;
        }
        
        var end = null;
        var end_found = false;
        current_line = start;
        while (!end_found){
            current_line_text = this.editor.session.getLine(current_line).trim();
            if (current_line_text.match(meta) != null && current_line > start){
                end = current_line - 1;
                end_found = true;
            } else if (current_line >= this.editor.session.getLength()){
                end = current_line - 1;
                end_found = true;
            }
            current_line++; 
        }
        
        return this.editor.session.getLines(start, end).join('\r');
    },

    changeHandler: function(){
        this.setState({
            theme: TabsStore.getEditorTheme(),
            mode: TabsStore.getEditorMode(),
        });
        this.editor.setTheme('ace/theme/' + this.state.theme);
        this.editor.setKeyboardHandler(this.state.mode);
        this.editor.resize();
        this.editor.focus();
    },

    fileOpenHandler: function(){
        filename = TabsStore.getEditorFile(this.props.eventKey);



        self = this;
        fd = fs.readFile(filename, 'utf8', function(err, data){
            if (err){
                console.log(err);
            } else {
                self.editor.session.setValue(data, -1);
            }
        });

    },

    fileSaveHandler: function(){
        filename = TabsStore.getEditorFile(this.props.eventKey);
        fs.writeFile(filename, this.editor.getValue(), function(err) {
            if(err) {
                return console.log(err);
            }
        }); 
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
