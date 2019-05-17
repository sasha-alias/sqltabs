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
var Modal = require('react-bootstrap').Modal;
var Button = require('react-bootstrap').Button;
var TabsStore = require('./TabsStore');
var Actions = require('./Actions');
var dialog = require('electron').remote.dialog;

var PasswordDialog = React.createClass({

    getInitialState: function(){
        return {
            hidden: true,
        }
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

    },

    componentDidUpdate: function(){
        if (!this.state.hidden){
            // editor takes over a focus for some reason
            // so focus it with a timeout
            setTimeout( ()=>{
                this.secretInput.focus();
                this.secretInput.select();
            }, 100);
        }
    },

    hide: function(){
        this.setState({hidden: true});
    },

    enterPassword: function(e){
        if (typeof(e) != 'undefined'){
            e.preventDefault();
            e.stopPropagation();
        }
        this.setState({hidden: true});
        Actions.setPassword(encodeURIComponent(this.secretInput.value), this.savePassword.checked );
    },

    enterAuthFile: function(e){
        if (typeof(e) != 'undefined'){
            e.preventDefault();
            e.stopPropagation();
        }

        this.setState({hidden: true});
        Actions.setPassword(this.secretInput.value, true);
    },

    chooseServiceFile: function(){
        dialog.showOpenDialog({ properties: ['openFile']},
            filenames => {
                console.log(filenames);
                if (filenames.length > 0){
                    this.secretInput.value = filenames[0];
                    this.secretInput.select();
                }
            }
        );
    },

    renderPasswordInput: function(secret){
        return (
            <Modal.Dialog
              bsStyle='primary'
              backdrop={false}
              animation={false}
              container={document.body}
              onRequestHide={this.hide}
              onRequestEnter={this.enterPassword}
              >

              <Modal.Body>
                <div className="form-group">
                    <form onSubmit={this.enterPassword}>
                        <label className="control-label"><span>Password</span></label>
                        <input
                            ref={ item => { this.secretInput = ReactDOM.findDOMNode(item); } }
                            type='password'
                            label='Password'
                            className="form-control"
                            defaultValue={secret}
                        />
                        <label>
                        <input
                            ref={ item => { this.savePassword = ReactDOM.findDOMNode(item); } }
                            type='checkbox'
                            defaultChecked={ secret != null }
                        /> save password
                        </label>
                    </form>
                </div>
              </Modal.Body>

              <Modal.Footer>
                <Button onClick={this.enterPassword}>Enter</Button>
                <Button onClick={this.hide}>Cancel</Button>
              </Modal.Footer>
            </Modal.Dialog>
        );
    },

    renderAuthFileInput: function(secret){
        return (
            <Modal.Dialog
              bsStyle='primary'
              backdrop={false}
              animation={false}
              container={document.body}
              onRequestHide={this.hide}
              onRequestEnter={this.enterAuthFile}
              >

              <Modal.Body>
                <div className="form-group">
                    <form onSubmit={this.enterAuthFile}>
                        <label className="control-label"><span>Service Account File</span></label>
                        <div style={{display: "flex"}}>
                        <input
                            ref={ item => { this.secretInput = ReactDOM.findDOMNode(item); } }
                            type="text"
                            label='Authentication File'
                            className="form-control"
                            defaultValue={secret}
                        />
                        <Button onClick={this.chooseServiceFile}>...</Button>
                        </div>
                    </form>
                </div>
              </Modal.Body>

              <Modal.Footer>
                <Button onClick={this.enterAuthFile}>Enter</Button>
                <Button onClick={this.hide}>Cancel</Button>
              </Modal.Footer>
            </Modal.Dialog>
        )
    },

    render: function(){

        if (this.state.hidden){
            return <span refs=""/>;
        } else {

            const selected_tab = TabsStore.tabs[TabsStore.selectedTab];
            const connector_type = selected_tab.connector_type;
            const connstr = selected_tab.connstr;
            const secret = TabsStore.getSecret(connstr);

            var inputForm = this.renderPasswordInput(secret);
            if (connector_type == 'firebase'){
                inputForm = this.renderAuthFileInput(secret);
            }

            return (
              <div className='static-modal'>
                        { inputForm }
              </div>
            );
        }
    },
});

module.exports = PasswordDialog;
