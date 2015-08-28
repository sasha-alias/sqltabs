var React = require('react');
var PasswordDialog = require('./PasswordDialog');
var About = require('./About');
var TabsNav = require('./TabsNav');
var TabContainer = require('./TabContainer');
var HistoryCarousel = require('./HistoryCarousel');
var Config = require('./Config');
var Actions = require('./Actions');
var CloudMessage = require('./CloudMessage');
var UpgradeMessage = require('./UpgradeMessage');

require('./Menu');

var mountNode = document.body;

var App = React.createClass({

    render: function(){
        return (
            <div className="tab-app">
                <TabsNav/>
                <TabContainer/>
                <PasswordDialog/>
                <About/>
                <HistoryCarousel/>
                <CloudMessage/>
                <UpgradeMessage/>
            </div>
        );
    },
});

var app = <App/>;

var theme = (Config.getTheme() || 'dark');
var size = (Config.getFontSize() || 'medium');
Actions.setTheme(theme);
Actions.setFontSize(size);
Actions.upgradeCheck();

React.render(app, mountNode);
