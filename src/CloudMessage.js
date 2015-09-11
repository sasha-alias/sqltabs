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
var Shell = require('shell');

var CloudMessage = React.createClass({

    getInitialState: function(){
        return {hidden: true}
    },

    componentDidMount: function(){
        TabsStore.bind('cloud-sent', this.sentHandler); 
        TabsStore.bind('cloud-message', this.cloudMessageHandler); 
    },

    componentWillUnmount: function(){
        TabsStore.unbind('cloud-sent', this.sentHandler); 
        TabsStore.unbind('cloud-message', this.cloudMessageHandler); 
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
        Shell.openExternal('http://www.sqltabs.com/api/1.0/docs/'+docid);
        this.hide();
    },

    render: function(){

        if (this.state.hidden){
            return <span refs=""/>;
        } else {


            if (this.state.status == 'sending'){ // sending in progress

                return this.renderProgress();

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

    renderProgress: function(){

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

                </div>

                <div className='modal-footer'>
                   <Button onClick={this.hide}>Cancel</Button>
                </div>

              </Modal>
            </div>
        );
    },

    renderMessage: function(docid){

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
                <table className="about-table"><tr>
                <td><img className="about-logo" src="logo.png"/></td>
                <td> <p> Your document is available on the URL: </p>
                     <p> <a href="#" onClick={this.open}>www.sqltabs.com/api/1.0/docs/{docid}</a></p>
                </td>
                </tr></table>

              </div>
              <div className='modal-footer'>
                 <Button onClick={this.open}>Open</Button>
              </div>

            </Modal>
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

            <Modal 
              bsStyle='primary'
              backdrop={false}
              animation={false}
              container={document.body}
              onRequestHide={this.hide}
              onRequestEnter={this.enter}
              >

              <div className='modal-body'>
                <table className="about-table"><tr>
                <td><img className="about-logo" src="logo.png"/></td>
                <td> <p> Error: </p>
                    <div className="alert alert-danger cloud-error"> {error} </div>
                </td>
                </tr></table>

              </div>
              <div className='modal-footer'>
                 <Button onClick={this.hide}>Close</Button>
              </div>

            </Modal>
          </div>
        );
    },
});

module.exports = CloudMessage;
