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
var Actions = require('./Actions');
var TabsStore = require('./TabsStore');
var remote = require('electron').remote;
var dialog = remote.dialog;
var fs = require('fs');
var path = require('path');
var async = require('async');

var Project = React.createClass({

    getInitialState: function(){
        return {
            projects: TabsStore.getProjects(),
            current_path: null,
            active: {type: "project", idx: -1},
            focused: false,
            files: [],
        };
    },

    componentDidMount: function(){
        TabsStore.bind('show-project-'+this.props.eventKey, this.showProjectHandler);
        TabsStore.bind('hide-project-'+this.props.eventKey, this.hideProjectHandler);
        TabsStore.bind('font-size-changed', this.resize);
        ReactDOM.findDOMNode(this.refs.project_div).addEventListener("keydown", this.keyPressHandler);

    },

    componentWillUnmount: function(){
        TabsStore.unbind('show-project-'+this.props.eventKey, this.showProjectHandler);
        TabsStore.unbind('hide-project-'+this.props.eventKey, this.hideProjectHandler);
        TabsStore.unbind('font-size-changed', this.resize);
        ReactDOM.findDOMNode(this.refs.project_div).removeEventListener("keydown", this.keyPressHandler);
    },

    showProjectHandler: function(){
        this.setState({focused: true}, function(){
            ReactDOM.findDOMNode(this.refs.hidden).focus();
        });
    },

    hideProjectHandler: function(){
        Actions.focusEditor();
    },

    componentDidUpdate: function(){

        this.resize();
    },

    resize: function(){
        var project_list = ReactDOM.findDOMNode(this.refs.project_list);
        var files_list = ReactDOM.findDOMNode(this.refs.project_files_list);
        $(files_list).height(
            $(project_list).parent().height() - $(project_list).height() - $(".tab-navigator").height()
        );
    },

    update: function(){
        this.setState({projects: TabsStore.getProjects()});
    },

    keyPressHandler: function(e){
        if (e.keyCode == 38){ // up
            this.goPrev();
        }
        if (e.keyCode == 40){ // down
            this.goNext();
        }
        if (e.keyCode == 13){ // enter
            this.enterHandler(e);
        }
        if (e.keyCode == 39){ // right arrow
            this.viewFile();
        }
        if (e.keyCode == 8){ // backspace
            this.goDirUp();
        }
    },

    viewFile: function(){
        var self = this;
        if (this.state.active.type == "file" && this.state.active.idx >= 0 && this.state.active.idx < this.state.files.length){
            var item = this.state.files[this.state.active.idx];
            if (!item.dir){
                Actions.openFile(item.path);
                setTimeout(
                    function(){ $("#project_div_"+self.props.eventKey).focus();},
                1);

            }
        }
    },

    goDirUp: function(){
        if (this.state.active.type == "file" && this.state.active.idx >= 0 && this.state.active.idx < this.state.files.length){
            var item = this.state.files[this.state.active.idx];
            var p = path.dirname(this.state.current_path);
            this.clickFolderHandler(p);
        }
    },

    goPrev: function(){
        // next project
        if (this.state.active.type == "project" && this.state.active.idx > 0){
            return this.setState({active: {type: "project", idx: this.state.active.idx-1}});
        }

        // next file
        if (this.state.active.type == "file" && this.state.active.idx > 0){
            return this.setState({active: {type: "file", idx: this.state.active.idx-1}},
            function(){
                scrollToUp("#project-files-list-"+this.props.eventKey, '#project_file_'+this.props.eventKey+'_'+this.state.active.idx);
            }
            );
        }

        // switch to projects
        if (this.state.active.type == "file" && this.state.active.idx == 0 && this.state.projects.length > 0){
            return this.setState({active: {type: "project", idx: this.state.projects.length-1}});
        }
    },

    goNext: function(){
        // next project
        if (this.state.active.type == "project" && this.state.active.idx < this.state.projects.length-1){
            return this.setState({active: {type: "project", idx: this.state.active.idx+1}});
        }

        // next file
        if (this.state.active.type == "file" && this.state.active.idx < this.state.files.length-1){
            return this.setState({active: {type: "file", idx: this.state.active.idx+1}},
            function(){
                scrollToDown("#project-files-list-"+this.props.eventKey, '#project_file_'+this.props.eventKey+'_'+this.state.active.idx);
            }
            );
        }

        // switch from projects to files
        if (this.state.active.type == "project" && this.state.active.idx >= this.state.projects.length-1 && this.state.files.length > 0){
            return this.setState({active: {type: "file", idx: 0}});
        }

    },

    enterHandler: function(e){
        var self = this;
        // load project
        if (this.state.active.type == "project" && this.state.active.idx >= 0 && this.state.active.idx < this.state.projects.length){
            var p = TabsStore.projects[this.state.active.idx].path;
            var files = this.loadPath(p);
            this.setState({
                current_path: p,
                files: files,
                active: {type: "file", idx: 0},
            });
            return;
        }

        // open file/dir
        if (this.state.active.type == "file" && this.state.active.idx >= 0 && this.state.active.idx < this.state.files.length){
            var item = this.state.files[this.state.active.idx];
            if (item.path == ".."){
                var p = path.dirname(this.state.current_path);
                this.clickFolderHandler(p);
            } else if (item.dir) {
                this.clickFolderHandler(item.path);
            } else {
                Actions.openFile(item.path);
            }
        }
    },

    addProjectHandler: function(){
        var self = this;

        dialog.showOpenDialog({ properties: ['openDirectory']},
            function(dirs){
                if (typeof(dirs) != 'undefined' && dirs.length == 1){
                    var dirname = dirs[0];
                    var alias = path.basename(dirname);
                    TabsStore.addProject(dirname, alias);
                    self.update();
                }
                $("#project_div_"+self.props.eventKey).focus(); // move focus out of link, to prevent open dialog on enter
            }
        );
    },

    toolbar: function(){
        if (this.state.current_path != null){
            var path = <div><span className="project-current-path">{this.state.current_path}</span></div>
        } else {
            var path = null;
        }

        return (
        <div className="project-toolbar">
            <div ref="hidden" tabIndex="0"/>
                <a href="#" onClick={this.addProjectHandler}> <span className="glyphicon glyphicon-plus-sign"/> </a>
            {path}
        </div>
        );
    },

    removeProjectHandler: function(idx){
        TabsStore.removeProject(idx);
        this.update();
    },

    loadProjectHandler: function(idx){
        var path = TabsStore.projects[idx].path;
        var files = this.loadPath(path);
        this.setState({
            current_path: path,
            files: files,
            active: {type: "file", idx: 0},
        });
    },

    clickFolderHandler: function(p){
        if (p == '..'){
            var p = path.dirname(this.state.current_path);
        }
        var files = this.loadPath(p);
        this.setState({
            current_path: p,
            files: files,
            active: {type: "file", idx: 0},
        });
    },

    loadPath: function(p){
        var dirs = [{path: '..', dir: true}];
        var files = [];

        var ls = fs.readdirSync(p);
        ls.forEach(function(file_name, idx){
            var file_path = path.join(p, file_name);
            var isdir = fs.lstatSync(file_path).isDirectory();
            if (isdir){
                dirs.push({path: file_path, dir: isdir});
            } else {
                files.push({path: file_path, dir: isdir});
            }
        });
        var all_list = dirs.concat(files);
        return all_list;
    },

    openFileHandler: function(e, file_path){
        if (e.shiftKey){
            var existing_tab = TabsStore.getTabByFilename(file_path);
            if ( existing_tab != null){
                Actions.select(existing_tab);
            } else {

                chain = [
                    function(done){Actions.newTab(); done();},
                    function(done){Actions.openFile(file_path); done();},
                ];
                async.series(chain);
            }
        } else {
            Actions.openFile(file_path);
        }
    },

    renderPath: function(){
        var self = this;
        if (this.state.current_path == null){
            return null;
        } else {
            var ret = [];

            this.state.files.forEach(function(item, idx){
                var file_name = path.basename(item.path);
                var file_path = item.path;
                var isdir = item.dir;
                var key = "project_file_"+self.props.eventKey+"_"+idx;

                if (self.state.active.type == 'file' && self.state.active.idx == idx){
                    var active_cls = " project-button-active";
                } else {
                    var active_cls = "";
                }

                if (isdir){
                    var item = <div id={key} className={"project-folder"+active_cls} key={key} onClick={
                        function(){
                            self.clickFolderHandler(file_path);
                        }}>
                        <span className="project-folder-icon glyphicon glyphicon-folder-close"/> {file_name}
                    </div>;
                    ret.push(item);
                } else {
                    var item = <div id={key} className={"project-file"+active_cls} key={key} onClick={function(event){self.openFileHandler(event, file_path)}}
                    > {file_name} </div>
                    ret.push(item);
                }

            });

            return <div id={"project-files-list-"+this.props.eventKey} className="project-files-list" ref="project_files_list">
            {ret}
            </div>
        }
    },

    renderProjects: function(){
        var self = this;

        var projects = this.state.projects.map(function(item, idx){
            if (self.state.active.type == "project" && self.state.active.idx == idx){
                return <div key={"project_"+self.props.eventKey+"_"+idx}>
                    <div className="project-button project-button-active" onClick={function(){self.loadProjectHandler(idx)}}> {item.alias} </div>
                    <div className="project-button-remove" onClick={function(){self.removeProjectHandler(idx)}}> <span className="glyphicon glyphicon-minus-sign"/></div>
                </div>;
            } else {
                return <div key={"project_"+self.props.eventKey+"_"+idx}>
                    <div className="project-button" onClick={function(){self.loadProjectHandler(idx)}}> {item.alias} </div>
                    <div className="project-button-remove" onClick={function(){self.removeProjectHandler(idx)}}> <span className="glyphicon glyphicon-minus-sign"/></div>
                </div>;
            }

        });

        return projects;
    },

    render: function(){

        return <div id={"project_div_"+this.props.eventKey} ref="project_div" tabIndex="0" className="project-div">
            <div className="project-list" ref="project_list">
                {this.renderProjects()}
                {this.toolbar()}
            </div>
            {this.renderPath()}
        </div>
    },

});

module.exports = Project;
