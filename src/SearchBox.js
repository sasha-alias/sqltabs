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

var SearchBox = React.createClass({

    getInitialState: function(){
        return {visible: false};
    },

    componentDidMount: function(){
        TabsStore.bind('toggle-find-box', this.toggleVisibility);
    },

    toggleVisibility: function(){
        this.setState({visible: TabsStore.searchVisible})
        if (this.state.visible){
            var searchInput = ReactDOM.findDOMNode(this.refs.searchInput)
            searchInput.focus();
            searchInput.select();
        }
    },

    submitHandler: function(e){
        var searchInput = ReactDOM.findDOMNode(this.refs.searchInput)
        e.preventDefault();
        e.stopPropagation();
        Actions.editorFindNext(searchInput.value);
    },

    keyPressHandler: function(e){
        if (e.keyCode == 27) { // esc
            Actions.toggleFindBox();
            e.preventDefault();
            e.stopPropagation();
        }
    },

    render: function(){
        if (this.state.visible){
            return (
            <div className="search-box">
                <form className="tab-toolbar-form" onSubmit={this.submitHandler}>
                    <input
                        className="search-input form-control"
                        ref="searchInput"
                        type="text"
                        placeholder="Search"
                        onKeyDown={this.keyPressHandler}
                    />
                </form>
            </div>);
        } else {
            return (<div/>);
        }
    },
});

module.exports = SearchBox;
