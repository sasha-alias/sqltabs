var React = require('react');
var Input = require('react-bootstrap').Input;
var DropdownButton = require('react-bootstrap').DropdownButton;
var MenuItem = require('react-bootstrap').MenuItem;
var TabActions = require('./Actions');
var TabsStore = require('./TabsStore');

var TabToolbar = React.createClass({

    getInitialState: function(){
        return {
            connstr: TabsStore.getConnstr(this.props.eventKey),
            history: TabsStore.connectionHistory,
        };
    },

    componentDidMount: function() {  
        TabsStore.bind('change', this.storeChangedHandler);
    },

    componentWillUnmount: function(){
        TabsStore.unbind('change', this.storeChangedHandler);
    },

    storeChangedHandler: function() {
        this.setState({
            connstr: TabsStore.getConnstr(this.props.eventKey),
            history: TabsStore.connectionHistory,
        });
    },

    connectionSubmitHandler: function(e){
        e.preventDefault();
        e.stopPropagation();
        TabActions.setConnection(this.props.eventKey, this.state.connstr);
    },

    connectionChangeHandler: function(e){
        this.setState({connstr: e.target.value});
    },


    render: function(){

        var history = this.state.history.map(function(item, i){
            return <option value={item} key={'connhist'+i}/>;
        });

        return (
        <div className="tab-toolbar"> 

            <form className="tab-toolbar-form" onSubmit={this.connectionSubmitHandler}>
                <Input
                    className="input-connstr"
                    ref="connInput"
                    onChange={this.connectionChangeHandler} 
                    type="text" 
                    placeholder="user@host:port/dbname"
                    list="history"
                /> 

                <datalist id="history">
                    {history}
                </datalist>
            </form>
        </div>
        );
    },

});

module.exports = TabToolbar;
