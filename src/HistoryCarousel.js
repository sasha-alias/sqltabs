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
var Modal = require('react-bootstrap').Modal;
var History = require('./History');
var Ace = require('brace');
var TabsStore = require('./TabsStore');
var Actions = require('./Actions');

require('brace/mode/pgsql');
require('brace/theme/chrome');
require('brace/theme/idle_fingers');
require('brace/keybinding/vim');

var HistoryCarousel = React.createClass({

    getInitialState: function(){
        return {hidden: true, idx: 0}
    },

    componentDidMount: function(){
        TabsStore.bind('toggle-history', this.historyHandler); 
        TabsStore.bind('change-theme', this.changeThemeHandler);
    },

    componentWillUnmount: function(){
        TabsStore.unbind('toggle-history', this.historyHandler); 
        TabsStore.unbind('change-theme', this.changeThemeHandler);

        React.findDOMNode(document.body).removeEventListener("keydown", this.keyPressHandler);
    },

    componentDidUpdate: function(){
        if (this.state.hidden == false && History.length() > 0){
            if (typeof(this.editor) == 'undefined' || this.editor == null){
                this.editor = Ace.edit("history_view");
                this.editor.setOptions({
                    maxLines: 30,
                    showGutter: false,
                    highlightActiveLine: false,
                    readOnly: true,
                });
                this.editor.renderer.$cursorLayer.element.style.opacity=0;
                this.editor.getSession().setMode('ace/mode/pgsql');
                this.editor.setTheme('ace/theme/' + TabsStore.getEditorTheme());
            }

            var item = History.get(this.state.idx);
            if (item != null){
                this.editor.session.setValue(item.query, -1);
            }
        }
    },

    historyHandler: function(){
        if (this.state.hidden){
            React.findDOMNode(document.body).addEventListener("keydown", this.keyPressHandler);
        } else {
            React.findDOMNode(document.body).removeEventListener("keydown", this.keyPressHandler);
            this.editor = null;
        }
        this.setState({
            hidden: !this.state.hidden,
            idx: 0,
        });
    },

    hide: function(){
        React.findDOMNode(document.body).removeEventListener("keydown", this.keyPressHandler);
        this.setState({hidden: true});
        this.editor = null;
    },

    keyPressHandler: function(e){
        if (e.keyCode == 38){ // up
            var next_item  = History.get(this.state.idx+1);
            if (next_item != null){
                this.setState({idx: this.state.idx+1}); 
            }
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        if (e.keyCode == 40){ // down
            var prev_item  = History.get(this.state.idx-1);
            if (prev_item != null){
                this.setState({idx: this.state.idx-1}); 
            }
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        if (e.keyCode == 13){ // enter
            Actions.pasteHistoryItem(this.state.idx);
            e.preventDefault();
            e.stopPropagation();
            this.hide();
            return;
        }
    },

    changeThemeHandler: function(){
        if (typeof(this.editor) != 'undefined'){
            this.editor.setTheme('ace/theme/' + TabsStore.getEditorTheme());
        }
    },

    render: function(){

        if (this.state.hidden){
            return (<span></span>);
        } else {

            var item = History.get(this.state.idx);
            if (item != null) {
                var d = new Date(item.time);
                var time = d.toLocaleTimeString();
                var date = d.toLocaleDateString();
            } else {
                return ( 
                <div className="static-modal"> 

                    <Modal 
                      bsStyle='primary'
                      backdrop={false}
                      animation={false}
                      container={document.body}
                      onRequestHide={this.hide}
                      >

                      <div className='modal-body'>
                      <p> Queries history is empty </p>
                      </div>

                    </Modal>
                
                </div>
                );
            }

            
            if (History.length() == 1){
                var arrows = <span/> ;
            } else if (this.state.idx == 0){
                var arrows = <span className="glyphicon glyphicon-arrow-up" aria-hidden="true"></span>;
            } else if (this.state.idx == History.length()-1){
                var arrows = <span className="glyphicon glyphicon-arrow-down" aria-hidden="true"></span>;
            } else {
                var arrows = <span>
                    <span className="glyphicon glyphicon-arrow-up" aria-hidden="true"></span>
                    <span className="glyphicon glyphicon-arrow-down" aria-hidden="true"></span>
                    </span>;
            }

            return (
            <div className="static-modal"> 

                <Modal 
                  bsStyle='primary'
                  backdrop={false}
                  animation={false}
                  container={document.body}
                  onRequestHide={this.hide}
                  >

                  <div className='modal-body'>
                      <table className="history-header">
                      <tr><td>
                      <span>{time}  </span>
                      <span>{date}  </span>
                      </td>
                      <td>
                      {arrows}
                      </td></tr>
                      </table>
                      <div id="history_view" className="history-view">
                      </div>
                  </div>

                </Modal>
            
            </div>
            );
        }
    }
});

module.exports = HistoryCarousel;
