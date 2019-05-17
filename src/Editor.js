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
var ReactDOM = require('react-dom');
var Ace = require('brace');
var FormatSQL = require('sql-formatter');
var Range = Ace.acequire('ace/range').Range;
var TabsStore = require('./TabsStore');
var Actions = require('./Actions');
var History = require('./History');
var fs = require('fs');
var $ = require('jquery');
var scrollUtils = require('./ScrollUtils');

require('brace/mode/pgsql');
require('brace/mode/javascript');
require('brace/theme/chrome');
require('brace/theme/idle_fingers');
require('brace/keybinding/vim');

var Editor = React.createClass({

    getInitialState: function(){
        var script = null;
        if (TabsStore.tmpScript != null){
            script = TabsStore.tmpScript;
            TabsStore.tmpScript = null;
        }

        this.completion_words = TabsStore.getCompletionWords();

        return {
            theme: TabsStore.getEditorTheme(),
            mode: TabsStore.getEditorMode(),
            script: script,
        };
    },

    componentDidMount: function(){
        this.editor = Ace.edit(this.props.name);
        this.editor.$blockScrolling = Infinity;
        this.editor.setTheme('ace/theme/' + this.state.theme);
        this.editor.setKeyboardHandler(this.state.mode);

        if (TabsStore.tabs[TabsStore.selectedTab].connector_type == 'firebase'){
            this.editor.getSession().setMode('ace/mode/javascript');
        } else {
            this.editor.getSession().setMode('ace/mode/pgsql');
        }

        TabsStore.bind('change', this.changeHandler);
        TabsStore.bind('editor-resize', this.resize);
        TabsStore.bind('change-theme', this.changeHandler);
        TabsStore.bind('change-mode', this.changeHandler);
        TabsStore.bind('open-file-'+this.props.eventKey, this.fileOpenHandler);
        TabsStore.bind('save-file-'+this.props.eventKey, this.fileSaveHandler);
        TabsStore.bind('close-file-'+this.props.eventKey, this.fileCloseHandler);
        TabsStore.bind('execute-script-'+this.props.eventKey, this.execHandler);
        TabsStore.bind('execute-block-'+this.props.eventKey, this.execBlockHandler);
        TabsStore.bind('execute-all-'+this.props.eventKey, this.execAllHandler);
        TabsStore.bind('format-block-'+this.props.eventKey, this.reFormatBlockHandler);
        TabsStore.bind('format-all-'+this.props.eventKey, this.reFormatAllHandler);
        TabsStore.bind('editor-find-next', this.findNext);
        TabsStore.bind('object-info-'+this.props.eventKey, this.objectInfoHandler);
        TabsStore.bind('paste-history-item-'+this.props.eventKey, this.pasteHistoryHandler);
        TabsStore.bind('focus-editor-'+this.props.eventKey, this.focusEditorHandler);
        TabsStore.bind('show-project-'+this.props.eventKey, this.hideCompleter);
        TabsStore.bind('hide-project-'+this.props.eventKey, this.hideCompleter);
        TabsStore.bind('toggle-project-'+this.props.eventKey, this.hideCompleter);
        TabsStore.bind('switch-view-'+this.props.eventKey, this.switchViewHandler);
        TabsStore.bind('completion-update', this.completionUpdateHandler);

        this.editor_input = $("#"+this.props.name).children(".ace_text-input").get()[0];
        this.editor_input.addEventListener("keydown", this.keyHandler, true);

        this.editor.commands.addCommand({
            name: "find",
            bindKey: {
                win: "Ctrl-F",
                mac: "Command-F"
            },
            exec: function() {
                Actions.toggleFindBox();
            },
            readOnly: true
        });

        this.editor.commands.addCommand({
            name: "history",
            bindKey: {
                win: "Ctrl-H",
                mac: "Command-Y"
            },
            exec: function() {
                Actions.toggleHistory();
            },
            readOnly: true
        });

        this.editor.commands.addCommand({
            name: "exec all",
            bindKey: {
                win: "Ctrl-Shift-E",
                mac: "Command-Shift-E"
            },
            exec: function() {
                Actions.execAll();
            },
            readOnly: true
        });

        this.editor.getSelectedText = function() {
            return this.session.getTextRange(this.getSelectionRange());
        }

        if (this.state.script != null){ // load script
            this.editor.session.setValue(this.state.script, -1);
        }

        this.editor.commands.removeCommand('showSettingsMenu'); // disable Cmd+,

        this.editor.focus();
    },

    componentWillUnmount: function(){
        TabsStore.unbind('change', this.changeHandler);
        TabsStore.unbind('editor-resize', this.resize);
        TabsStore.unbind('change-theme', this.changeTheme);
        TabsStore.unbind('change-mode', this.changeMode);
        TabsStore.unbind('open-file-'+this.props.eventKey, this.fileOpenHandler);
        TabsStore.unbind('save-file-'+this.props.eventKey, this.fileSaveHandler);
        TabsStore.unbind('save-file-'+this.props.eventKey, this.fileCloseHandler);
        TabsStore.unbind('execute-script-'+this.props.eventKey, this.execHandler);
        TabsStore.unbind('execute-block-'+this.props.eventKey, this.execBlockHandler);
        TabsStore.unbind('execute-all-'+this.props.eventKey, this.execAllHandler);
        TabsStore.unbind('format-block-'+this.props.eventKey, this.reFormatBlockHandler);
        TabsStore.unbind('format-all-'+this.props.eventKey, this.reFormatAllHandler);
        TabsStore.unbind('editor-find-next', this.findNext);
        TabsStore.unbind('object-info-'+this.props.eventKey, this.objectInfoHandler);
        TabsStore.unbind('paste-history-item-'+this.props.eventKey, this.pasteHistoryHandler);
        TabsStore.unbind('focus-editor-'+this.props.eventKey, this.focusEditorHandler);
        TabsStore.unbind('show-project-'+this.props.eventKey, this.hideCompleter);
        TabsStore.unbind('hide-project-'+this.props.eventKey, this.hideCompleter);
        TabsStore.unbind('toggle-project-'+this.props.eventKey, this.hideCompleter);
        TabsStore.unbind('switch-view-'+this.props.eventKey, this.switchViewHandler);
        TabsStore.unbind('completion-update', this.completionUpdateHandler);

        this.editor_input.removeEventListener("keydown", this.keyHandler);
    },

    switchViewHandler: function(){
        this.editor.resize();
    },

    execHandler: function() {
        var selected = this.editor.getSelectedText();
        var script;
        if (selected) {
            script = selected;
        } else {
            script = this.editor.getValue();
        }
        Actions.runQuery(this.props.eventKey, script);
    },

    execBlockHandler: function(){
        var selected = this.editor.getSelectedText();
        var script;
        if (selected) {
            script = selected;
        } else {
            var current_line = this.editor.selection.getCursor().row;
            script = this.detectBlock(current_line, this.editor.getValue);
        }
        Actions.runQuery(this.props.eventKey, script);

    },

    execAllHandler: function(){
        var meta = /^\s*---\s*.*/;
        var markdown_start = /^\s*\/\*\*/;
        var markdown_end = /\*\*\/\s*$/;
        var current_line = 0;
        var blocks = [];
        var block = [];
        var inside_markdown = false;
        while (current_line < this.editor.session.getLength()){
            var current_line_text = this.editor.session.getLine(current_line).trim();

            if (current_line_text.match(markdown_start) != null){
                inside_markdown = true;
            }
            if (current_line_text.match(markdown_end) != null){
                inside_markdown = false;
            }
            if (current_line > 0 && current_line_text.match(meta) != null && !inside_markdown){ // new block started
                blocks.push(block.join('\n'));
                block = [];
            }
            block.push(current_line_text);
            current_line++;
        }

        if (block.length > 0){ // append last block if any remained
            blocks.push(block.join('\n'));
        }

        Actions.runAllBlocks(this.props.eventKey, blocks);
    },

    reFormatBlockHandler: function(){
        var current_line = this.editor.selection.getCursor().row;
        this.autoFormatBlock(current_line, this.editor.getValue);
    },

    reFormatAllHandler: function(){
        var meta = /^\s*---\s*.*/;
        var current_line = 0;
        var block_start = 0;
        var block_length = 0;
        while (current_line < this.editor.session.getLength()){
            var current_line_text = this.editor.session.getLine(current_line).trim();
            if (current_line > 0 && meta.test(current_line_text)){ // new block started
                // Reformat detected block
                var block_end = block_start + block_length -1;
                var new_block_length = this.reformatLines(block_start, block_end);
                // Move current line based on how many lines the reformatting added
                current_line += new_block_length - block_length;
                block_start = current_line;
                block_length = 0;
            }
            block_length++;
            current_line++;
        }

        if (block_length > 0){ // append last block if any remained
            this.reformatLines(block_start, block_start + block_length);
        }
    },

    detectBlockLines: function(current_line){
        var meta = /^\s*---\s*.*/;
        var markdown_start = /^\s*\/\*\*/;
        var markdown_end = /\*\*\/\s*$/;
        var inside_markdown = false;
        var start = 0;
        var start_found = false;
        while (!start_found){
            var current_line_text = this.editor.session.getLine(current_line).trim();
            if (current_line_text.match(markdown_end) != null){
                inside_markdown = true;
            }
            if (current_line_text.match(markdown_start) != null){
                inside_markdown = false;
            }

            if (current_line === 0) {
                start = current_line;
                start_found = true;
            } else if (current_line_text.match(meta) != null && !inside_markdown){
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
            if (current_line_text.match(markdown_start) != null){
                inside_markdown = true;
            }
            if (current_line_text.match(markdown_end) != null){
                inside_markdown = false;
            }

            if (current_line_text.match(meta) != null && current_line > start && !inside_markdown){
                end = current_line - 1;
                end_found = true;
            } else if (current_line >= this.editor.session.getLength()){
                end = current_line - 1;
                end_found = true;
            }
            current_line++;
        }

        return [start, end];
    },

    detectBlock: function(current_line, script) {
        var lines = this.detectBlockLines(current_line, script);
        return this.editor.session.getLines(lines[0], lines[1]).join('\n');
    },

    reformatLines: function (start, end) {
        var lastLine = this.editor.session.getLine(end);
        var originalCode = this.editor.session.getLines(start, end).join('\n');
        console.log(originalCode);
        var reFormattedCode = FormatSQL.format(originalCode);
        this.editor.session.replace(new Range(start, 0, end, lastLine.length), reFormattedCode);
        return reFormattedCode.split('\n').length;
    },

    autoFormatBlock: function (current_line, script) {
        var lines = this.detectBlockLines(current_line, script);
        this.reformatLines(lines[0], lines[1]);
    },

    componentDidUpdate: function(){
        this.editor.setTheme('ace/theme/' + this.state.theme);
        this.editor.setKeyboardHandler(this.state.mode);
        this.editor.resize();
        this.editor.focus();
    },

    changeHandler: function(){
        this.setState({
            theme: TabsStore.getEditorTheme(),
            mode: TabsStore.getEditorMode(),
        });
    },

    fileOpenHandler: function(){
        var self = this;
        var filename = TabsStore.getEditorFile(this.props.eventKey);
        var data = fs.readFileSync(filename, 'utf8');
        self.editor.session.setValue(data, -1);
    },

    fileSaveHandler: function(){
        var self = this;
        var position = self.editor.getCursorPosition();
        var scrollRow = self.editor.renderer.getScrollTopRow();
        var filename = TabsStore.getEditorFile(this.props.eventKey);
        var content = self.editor.getValue().replace(/[^\S\r\n]+$/gm, ""); // trim trailing spaces
        fs.writeFile(filename, content, function(err) {
            if(err) {
                return console.log(err);
            } else {
                self.editor.session.setValue(content);
                self.editor.clearSelection();
                self.editor.gotoLine(position.row+1, 0);
                self.editor.renderer.scrollToRow(scrollRow);
            }
        });
    },

    fileCloseHandler: function(){
        this.editor.setValue('');
    },

    findNext: function(){

        var init_position = this.editor.getCursorPosition();
        var value = TabsStore.getSearchValue();
        var ret = this.editor.find(value ,{
          backwards: false,
          wrap: false,
          caseSensitive: false,
          wholeWord: false,
          regExp: false,
          start: 0,
        });

        if (typeof(ret) == 'undefined'){ // start from the beginning in case of end of file
            this.editor.gotoLine(0, 0, true);
            ret = this.editor.find(value ,{
              backwards: false,
              wrap: false,
              caseSensitive: false,
              wholeWord: false,
              regExp: false,
              start: 0,
            });

            if (typeof(ret) == 'undefined'){ // if nothing found
                this.editor.gotoLine(init_position.row+1, init_position.column, false);
            }
        }
    },

    objectInfoHandler: function(){
        // detect object under cursor
        var pos = this.editor.getCursorPosition();
        var line_text = this.editor.session.getLine(pos.row);
        var part1 = line_text.substring(0, pos.column);
        part1 = part1.match("[A-z0-9.]*$");
        if (part1 != null){
            part1 = part1[0]
        } else {
            part1 = ""
        }

        var part2 = line_text.substring(pos.column);
        part2 = part2.match("^[A-z0-9.]+");
        if (part2 != null){
            part2 = part2[0]
        } else {
            part2 = ""
        }

        var object = part1 + part2;
        Actions.getObjectInfo(object);
    },

    pasteHistoryHandler: function(){
        var item = History.get(TabsStore.getHistoryItem());
        if (item != null){
            var position = this.editor.getCursorPosition();
            this.editor.getSession().insert(position, item.query);
        }
        this.editor.focus();
    },

    focusEditorHandler: function(){
        this.editor.focus();
    },

    resize: function(){
        this.editor.resize();
    },

    keyHandler: function(e){
        var self = this;
        if (e.keyCode == 9){ // tab
            if (this.completion_mode){
                e.preventDefault();
                e.stopPropagation();
                if (e.shiftKey){
                    return this.completePrev();
                } else {
                    return this.completeNext();
                }
            }
        }

        if (e.keyCode == 40){ // down
            return this.completeNext();
        }

        if (e.keyCode == 38){ // up
            return this.completePrev();
        }

        if ([37,39,27].indexOf(e.keyCode) != -1){// hide autocompletion on arrows, esc
            return this.hideCompleter();
        }

        if ([16,17,18,91].indexOf(e.keyCode) < 0){  // ignore shift, ctr, alt, command
            var vim_mode = this.getVimMode();
            if (vim_mode == null || vim_mode == 'insert'){ // don't show autocompletion in normal mode of vim
                setTimeout(function(){
                    self.adjustCompletion();
                }, 1);
            }
        }
    },

    completionUpdateHandler: function(){
        this.completion_words = TabsStore.getCompletionWords();
    },

    adjustCompletion: function(){
        if (!TabsStore.auto_completion){
            return;
        }
        var completer = $(ReactDOM.findDOMNode(this.refs.completer));
        var cursor = $("#"+this.props.name).find(".ace_cursor");
        var offset = {
            top: cursor.offset().top + cursor.height(),
            left: cursor.offset().left,
        };
        var position = this.editor.selection.getCursor();
        var line = this.editor.session.getLine(position.row);
        line = (line.slice(0, position.column)).toLowerCase();
        var word = line.match(/\w+$/);
        if (word != null){
            word = word[0];
            this.getHints(word);
            if (this.hints.length > 0){
                completer.show();
                completer.offset(offset);
                completer.html(this.renderHints());
                this.completion_mode = true;
                this.editor.commands.removeCommand('indent'); // disable tab
                this.editor.commands.removeCommand('golineup'); // disable up
                this.editor.commands.removeCommand('golinedown'); // disable down
                return;
            } else {
                this.hideCompleter();
            }
        } else {
            this.hideCompleter();
        }
    },

    hideCompleter: function(){
        this.completion_mode = false;
        this.hints = [];
        var completer = $(ReactDOM.findDOMNode(this.refs.completer));
        completer.hide();
        this.editor.commands.addCommand({ // enable tab back
            name: "indent",
            bindKey: {win: "Tab", mac: "Tab"},
            exec: function(editor) { editor.indent(); },
            multiSelectAction: "forEach",
            scrollIntoView: "selectionPart"
        });

        this.editor.commands.addCommand({ // enable up back
            name: "golineup",
            bindKey: {win: "Up", mac: "Up|Ctrl-P"},
            exec: function(editor, args) { editor.navigateUp(args.times); },
            multiSelectAction: "forEach",
            scrollIntoView: "cursor",
            readOnly: true
        });

        this.editor.commands.addCommand({ // enable down back
            name: "golinedown",
            bindKey: {win: "Down", mac: "Down|Ctrl-N"},
            exec: function(editor, args) { editor.navigateDown(args.times); },
            multiSelectAction: "forEach",
            scrollIntoView: "cursor",
            readOnly: true
        });

    },

    getHints: function(word){
        var hints = [];
        for (var i=0; i< this.completion_words.length; i++){
            if (this.completion_words[i].toLowerCase().startsWith(word)){
                hints.push(this.completion_words[i])
            }
        }
        this.hints = hints;
        this.current_hint = -1;
        return hints;
    },

    complete: function(){
        var hint = this.hints[this.current_hint];
        var position = this.editor.getCursorPosition();
        var line = this.editor.session.getLine(position.row);
        line = line.slice(0, position.column);
        line = line.match(/\w+$/);
        if (line != null){
            var word = line[0];
            var range = new Range(position.row, position.column - word.length, position.row, position.column);
            this.editor.getSession().replace(range, hint);
        }

        var completer = $(ReactDOM.findDOMNode(this.refs.completer));
        completer.html(this.renderHints());

    },

    completeNext: function(){
        if (this.current_hint < this.hints.length-1){
            this.current_hint = this.current_hint + 1;
        } else if (this.current_hint == this.hints.length-1){
            this.current_hint = 0;
        }

        this.complete();
        scrollUtils.scrollToDown("#completion-list-"+this.props.eventKey, "#completion-hint-active-"+this.props.eventKey);

    },

    completePrev: function(){
        if (this.current_hint > 0){
            this.current_hint = this.current_hint-1;
        } else if (this.current_hint == 0){
            this.current_hint = this.hints.length-1;
        }
        this.complete();
        scrollUtils.scrollToUp("#completion-list-"+this.props.eventKey, "#completion-hint-active-"+this.props.eventKey);
    },

    renderHints: function(){
        var list = "";
        for (var i=0; i<this.hints.length; i++){
            if (i == this.current_hint){
                list += '<li class="completion-hint-active" id="completion-hint-active-'+this.props.eventKey+'">'+this.hints[i]+'</li>';
            } else {
                list += '<li class="completion-hint">'+this.hints[i]+'</li>';
            }
        }
        return "<ul>"+list+"</ul>";
    },

    getVimMode: function(){
        var normal_mode = $("#editor-"+this.props.eventKey)[0].className.split(" ").indexOf("normal-mode");
        var insert_mode = $("#editor-"+this.props.eventKey)[0].className.split(" ").indexOf("insert-mode");
        if (normal_mode != -1){
            return 'normal';
        }
        if (insert_mode != -1){
            return 'insert';
        }
        return null;
    },

    render: function(){

        return (
            <div className="edit-area">
                <div ref="container" id={this.props.name} mode={this.state.mode}/>
                <div ref="completer" className="completion-list" id={"completion-list-"+this.props.eventKey}/>
            </div>
        );
    },
});

module.exports = Editor;
