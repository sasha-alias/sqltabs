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
var Shell = require('electron').shell;
var Crypto = require("crypto");

var CloudMessage = React.createClass({

    getInitialState: function(){
        this.target_server = TabsStore.sharingServer;

        const rnd = Crypto.randomBytes(16).toString('hex');
        return {
            hidden: true,
            encrypt: false,
            encryptionKey: rnd,
        }
    },

    componentDidMount: function(){
        TabsStore.bind('cloud-dialog', this.dialogHandler);
        TabsStore.bind('cloud-sent', this.sentHandler);
        TabsStore.bind('cloud-message', this.cloudMessageHandler);
    },

    componentWillUnmount: function(){
        TabsStore.unbind('cloud-dialog', this.dialogHandler);
        TabsStore.unbind('cloud-sent', this.sentHandler);
        TabsStore.unbind('cloud-message', this.cloudMessageHandler);
    },

    dialogHandler: function(){
        this.setState({
            hidden: false,
            status: 'dialog',
        });
    },

    targetChangeHandler: function(e){
        this.target_server = e.target.value;
    },

    share: function(){
        var encryptionKey = null;
        if (this.state.encrypt){
            encryptionKey = this.encryptionKeyField.value;
            this.setState({encryptionKey});
        }
        Actions.share(this.target_server, this.state.encrypt, encryptionKey);
    },

    sentHandler: function(){
        this.setState({
            hidden: false,
            status: 'sending',
        });
    },

    cloudMessageHandler: function(){
        this.setState({
            hidden: false,
            status: 'message',
        });
    },

    hide: function(){
        this.setState({hidden: true});
    },

    open: function(){
        var docid = TabsStore.getCloudDoc();
        var target_server = this.target_server;
        if (this.target_server.indexOf("http://") == -1 && this.target_server.indexOf('https://') == -1){
            target_server = "https://"+this.target_server;
        }
        Shell.openExternal(target_server+'/api/1.0/docs/'+docid);
        this.hide();
    },

    render: function(){

        if (this.state.hidden){
            return <span refs=""/>;
        } else {


            if (this.state.status == 'sending'){ // sending in progress

                return this.renderProgress();

            } else if (this.state.status == 'dialog'){ // share dialog

                return this.renderDialog();

            } else { // message from cloud

                var docid = TabsStore.getCloudDoc();

                if (docid != null){

                    return this.renderMessage(docid);

                } else {

                    return this.renderError();

                }
            }
        }
    },

    renderDialog: function(){

        var encryptionKeyField = null;
        if (this.state.encrypt){
            encryptionKeyField = <div>
                Encryption key
                <input
                    ref={ item => { this.encryptionKeyField = ReactDOM.findDOMNode(item); } }
                    className="target-server-input"
                    type="text"
                    defaultValue={ this.state.encryptionKey }/>
                </div>
        }

        return(
            <div className='static-modal'>

              <Modal.Dialog
                bsStyle='primary'
                backdrop={false}
                animation={false}
                container={document.body}
                onRequestHide={this.hide}
                onRequestEnter={this.enter}
                >

                <Modal.Body>

                    <table className="about-table"><tr>
                    <td><img className="about-logo" src="logo.png"/></td>
                    <td>
                        <div>
                            Share on
                            <input ref="target_server"
                                onChange={this.targetChangeHandler}
                                className="target-server-input"
                                type="text"
                                placeholder="share.sqltabs.com"
                                defaultValue={this.target_server}>
                            </input>

                            <label>
                            <input
                                className="target-server-encryption-switch"
                                defaultChecked={this.state.encrypt}
                                onChange={ ()=>{ this.setState({encrypt: !this.state.encrypt}) }}
                                type="checkbox"/>
                            Encrypt
                            </label>

                            { encryptionKeyField }
                        </div>
                    </td>
                    </tr></table>

                </Modal.Body>

                <Modal.Footer>
                   <Button onClick={this.share}>OK</Button>
                   <Button onClick={this.hide}>Cancel</Button>
                </Modal.Footer>

              </Modal.Dialog>
            </div>
        );
    },

    renderProgress: function(){

        return (
            <div className='static-modal'>

              <Modal.Dialog
                bsStyle='primary'
                backdrop={false}
                animation={false}
                container={document.body}
                onRequestHide={this.hide}
                onRequestEnter={this.enter}
                >

                <Modal.Body>

                    <table className="about-table"><tr>
                    <td><img className="about-logo" src="logo.png"/></td>
                    <td>
                        <div className="progress">
                          <div className="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="45" aria-valuemin="0" aria-valuemax="100" style={{width: "100%"}}>
                            <span className="sr-only">sharing ... </span>
                          </div>
                        </div>
                    </td>
                    </tr></table>

                </Modal.Body>

                <Modal.Footer>
                   <Button onClick={this.hide}>Cancel</Button>
                </Modal.Footer>

              </Modal.Dialog>
            </div>
        );
    },

    renderMessage: function(docid){

        return (
          <div className='static-modal'>

            <Modal.Dialog
              bsStyle='primary'
              backdrop={false}
              animation={false}
              container={document.body}
              onRequestHide={this.hide}
              onRequestEnter={this.enter}
              >

              <Modal.Body>
                <table className="about-table"><tr>
                <td><img className="about-logo" src="logo.png"/></td>
                <td> <p> Your document is available on the URL: </p>
                     <p> <a href="#" onClick={this.open}>{this.target_server}/api/1.0/docs/{docid}</a></p>
                </td>
                </tr></table>

              </Modal.Body>

              <Modal.Footer>
                 <Button onClick={this.open}>Open</Button>
              </Modal.Footer>

            </Modal.Dialog>
          </div>
        );
    },

    renderError: function(){

        var error = TabsStore.getCloudError();
        if (error == null){
            error = 'Unknown Error';
        }

        error = JSON.stringify(error);

        return (
          <div className='static-modal'>

            <Modal.Dialog
              bsStyle='primary'
              backdrop={false}
              animation={false}
              container={document.body}
              onRequestHide={this.hide}
              onRequestEnter={this.enter}
              >

              <Modal.Body>
                <table className="about-table"><tr>
                <td><img className="about-logo" src="logo.png"/></td>
                <td> <p> Error: </p>
                    <div className="alert alert-danger cloud-error"> {error} </div>
                </td>
                </tr></table>

              </Modal.Body>

              <Modal.Footer>
                 <Button onClick={this.hide}>Close</Button>
              </Modal.Footer>

            </Modal.Dialog>
          </div>
        );
    },
});

module.exports = CloudMessage;
