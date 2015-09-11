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
var TabActions = require('./Actions');
var TabsStore = require('./TabsStore');

var ConnInput = React.createClass({

    getInitialState: function(){
        return {
            connstr: TabsStore.getConnstr(this.props.eventKey),
            history: TabsStore.connectionHistory,
            active: false,
            hilight: -1
        };
    },

    componentDidMount: function() {  
        TabsStore.bind('change', this.storeChangedHandler);
        TabsStore.bind('goto-connstr-'+this.props.eventKey, this.focusConnstr);

        React.findDOMNode(this).addEventListener("focusout", this.unfocusHandler);
    },

    componentWillUnmount: function(){
        TabsStore.unbind('change', this.storeChangedHandler);
        TabsStore.unbind('goto-connstr-'+this.props.eventKey, this.focusConnstr);

        React.findDOMNode(this).removeEventListener("focusout", this.unfocusHandler);
    },

    storeChangedHandler: function() {
        this.setState({
            connstr: TabsStore.getConnstr(this.props.eventKey),
            history: TabsStore.connectionHistory,
        });
    },

    focusConnstr: function(){
        var connInput = React.findDOMNode(this.refs.connInput)
        connInput.focus();
        connInput.select();
    },

    connectionSubmitHandler: function(e){
        e.preventDefault();
        e.stopPropagation();
        this.setState({hilight: -1});
        TabActions.setConnection(this.props.eventKey, this.state.connstr);
    },

    connectionChangeHandler: function(e){
        this.setState({connstr: e.target.value});
    },

    focusHandler: function(e){
        this.setState({active: true});
    },

    unfocusHandler: function(e){
        this.setState({
            active: false,
            connstr: TabsStore.getConnstr(this.props.eventKey),
            hilight: -1,
        });
    },

    pickHandler: function(e){
        var idx = e.target.getAttribute("data-idx");
        this.setState({
            active: false,
            connstr: TabsStore.connectionHistory[idx],
            hilight: -1,
        });
        TabActions.setConnection(this.props.eventKey, TabsStore.connectionHistory[idx]);
    },

    dontLoseFocus: function(){
        React.findDOMNode(this).removeEventListener("focusout", this.unfocusHandler);
    },

    allowLoseFocus: function(){
        React.findDOMNode(this).addEventListener("focusout", this.unfocusHandler);
    },

    keyPressHandler: function(e){
        var history_length = TabsStore.connectionHistory.length;
        if (TabsStore.connectionHistory.length == 0 || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey){
            return;
        }
        if (e.keyCode == 40){ // down
            var hilight = (this.state.hilight < history_length - 1 ) ? this.state.hilight+1 : 0;
            this.setState({
                active: true,
                hilight: hilight,
                connstr: TabsStore.connectionHistory[hilight],
            });
            e.preventDefault();
            e.stopPropagation();
        } else if (e.keyCode == 38) { // up
            var hilight = (this.state.hilight == 0 ) ? history_length-1 : this.state.hilight-1;
            this.setState({
                active: true,
                hilight: hilight,
                connstr: TabsStore.connectionHistory[hilight],
            });
            e.preventDefault();
            e.stopPropagation();
        } else if (e.keyCode == 27) { // esc
            this.setState({
                active: false,
                hilight: -1,
            });
            e.preventDefault();
            e.stopPropagation();
        } 
    },

    itemMouseOverHandler: function(e){
        var idx = e.target.getAttribute("data-idx");
        this.setState({hilight: idx});
    },

    render: function(){

        var self = this;

        var history = this.state.history.map(function(item, i){
            var hilighted = (i==self.state.hilight)? ' conn_history_item_active' : '';
            return <li data-idx={i} onMouseOver={self.itemMouseOverHandler} onClick={self.pickHandler} className={"conn_history_item"+hilighted} key={'connhist'+i}>{item}</li>;
        });

        if (this.state.active && TabsStore.connectionHistory.length > 0){
            var visibility = "conn_history_visisble"
        } else {
            var visibility = "conn_history_hidden"
        }
        
        var history_div = 
            <div className={"conn_history "+visibility} onMouseEnter={this.dontLoseFocus} onMouseLeave={this.allowLoseFocus}>
                <ul className="conn_history_list">
                {history}
                </ul>
            </div>;


        return (
            <div>
                <form className="tab-toolbar-form" onSubmit={this.connectionSubmitHandler}>
                    <input
                        className="input-connstr form-control"
                        ref="connInput"
                        onChange={this.connectionChangeHandler} 
                        type="text" 
                        placeholder="user@host:port/dbname"
                        value={this.state.connstr}
                        onFocus={this.focusHandler}
                        onKeyDown={this.keyPressHandler}
                    /> 
                </form>
                {history_div}
            </div>
        );
    },
});

module.exports = ConnInput;
