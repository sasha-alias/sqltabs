
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
        Actions.setPassword(passwordInput.value);
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
