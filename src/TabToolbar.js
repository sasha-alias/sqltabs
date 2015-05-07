var React = require('react');
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
        TabsStore.bind('goto-connstr-'+this.props.eventKey, this.focusConnstr);
    },

    componentWillUnmount: function(){
        TabsStore.unbind('change', this.storeChangedHandler);
        TabsStore.unbind('goto-connstr-'+this.props.eventKey, this.focusConnstr);
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
                <input
                    className="input-connstr form-control"
                    ref="connInput"
                    onChange={this.connectionChangeHandler} 
                    type="text" 
                    placeholder="user@host:port/dbname"
                    list="history"
                    value={this.state.connstr}
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
