
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
        TabsStore.bind('cloud-message', this.cloudMessageHandler); 
    },

    componentWillUnmount: function(){
        TabsStore.unbind('cloud-message', this.cloudMessageHandler); 
    },

    cloudMessageHandler: function(){
        this.setState({
            hidden: false,
        });
    },

    hide: function(){
        this.setState({hidden: true});
    },

    render: function(){

        if (this.state.hidden){
            return <span refs=""/>;
        } else {

            var docid = TabsStore.getCloudDoc();
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
                         <p> <a href="#" onClick={function(){Shell.openExternal('http://www.sqltabs.com/api/1.0/docs/'+docid);}}>www.sqltabs.com/api/1.0/docs/{docid}</a></p>
                    </td>
                    </tr></table>

                  </div>
                  <div className='modal-footer'>
                     <Button onClick={this.hide}>OK</Button>
                  </div>

                </Modal>
              </div>
            );
        }
    },
});

module.exports = CloudMessage;
