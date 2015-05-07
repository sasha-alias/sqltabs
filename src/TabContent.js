var React = require('react');
var TabsStore = require('./TabsStore');
var TabActions = require('./Actions');
var OutputConsole = require('./OutputConsole');
var TabSplit = require('./TabSplit');
var Editor = require('./Editor');
var TabToolbar = require('./TabToolbar');

var TabContent = React.createClass({

    getInitialState: function(){
        return {
            theme: TabsStore.theme
        };
    },

    componentDidMount: function() {  
        TabsStore.bind('change', this.storeChangedHandler);
    },

    componentWillUnmount: function() {  
        TabsStore.unbind('change', this.storeChangedHandler);
    },

    storeChangedHandler: function(){
        this.setState({
            theme: TabsStore.theme
        });
    },

    render: function(){

        var cls = (this.props.visible) ? 'tab-content': 'tab-content hidden';

        return (

            <div className={cls}>

                <TabToolbar eventKey={this.props.eventKey}/>

                <TabSplit>

                    <Editor name={'editor-'+this.props.eventKey} theme={this.state.theme} eventKey={this.props.eventKey}/>

                    <OutputConsole eventKey={this.props.eventKey}/>

                </TabSplit>

            </div>
        );
    }
});

module.exports = TabContent;
