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
var Button = require('react-bootstrap').Button;
var OverlayMixin = require('react-bootstrap').OverlayMixin;
var TabsStore = require('./TabsStore');
var Actions = require('./Actions');

var PasswordDialog = React.createClass({

    getInitialState: function(){
        return {hidden: true}
    },

    componentDidMount: function(){
        TabsStore.bind('ask-password', this.askPasswordHandler); 
    },

    componentWillUnmount: function(){
        TabsStore.unbind('ask-password', this.askPasswordHandler); 
    },

    askPasswordHandler: function(){
        this.setState({
            hidden: false,
        });

        var passwordInput = React.findDOMNode(this.refs.passwordInput);
        passwordInput.focus();
    },

    hide: function(){
        this.setState({hidden: true});
    },

    enter: function(e){
        if (typeof(e) != 'indefined'){
            e.preventDefault();
            e.stopPropagation();
        }
        this.setState({hidden: true});
        var passwordInput = React.findDOMNode(this.refs.passwordInput);
        Actions.setPassword(encodeURIComponent(passwordInput.value));
    },

    render: function(){

        if (this.state.hidden){
            return <span refs=""/>;
        } else {

            return (
              <div className='static-modal'>

                <Modal 
                  bsStyle='primary'
                  backdrop={false}
                  animation={false}
                  container={document.body}
                  onRequestHide={this.hide}
                  onRequestEnter={this.enter}
                  >

                  <div className='modal-body'>
                    <div className="form-group">
                        <label className="control-label"><span>Password</span></label>
                        <form onSubmit={this.enter}>
                            <input ref="passwordInput" type='password' label='Password' className="form-control"/>
                        </form>
                    </div>
                  </div>

                  <div className='modal-footer'>
                    <Button onClick={this.enter}>Enter</Button>
                    <Button onClick={this.hide}>Cancel</Button>
                  </div>
                </Modal>
              </div>
            );
        }
    },
});

module.exports = PasswordDialog;
