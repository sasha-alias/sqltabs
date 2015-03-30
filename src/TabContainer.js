var React = require('react');
var Input = require('react-bootstrap').Input;
var DropdownButton = require('react-bootstrap').DropdownButton;
var MenuItem = require('react-bootstrap').MenuItem;
var TabsStore = require('./TabsStore');
var TabActions = require('./Actions');
var TabContent = require('./TabContent');


var TabContainer = React.createClass({

    getInitialState: function(){
        return {
            theme: TabsStore.theme,
            order: TabsStore.order,
            current: TabsStore.selectedTab,
        };
    },

    componentDidMount: function() {  
        TabsStore.bind('change', this.stateChangedHandler);
    },

    componentWillUnmount: function() {  
        TabsStore.unbind('change', this.stateChangedHandler);
    },

    stateChangedHandler: function(){
        this.setState({
            theme: TabsStore.theme,
            order: TabsStore.order,
            current: TabsStore.selectedTab,
        });
    },

    themeButtonHandler: function(key){
        TabActions.setTheme(key);
    },

    
    render: function(){

        var tabs = this.state.order;
        var current = this.state.current;
        var tabsHtml = tabs.map(function(item){
            var visible = (current === item);
            return <TabContent key={item} eventKey={item} visible={visible}/>;
        });

        return (
            <div className="tab-container">
                {tabsHtml}
            </div>
        );
    }
});

module.exports = TabContainer;
