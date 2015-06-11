var React = require('react');
var PasswordDialog = require('./PasswordDialog');

var mountNode = document.body;

var TabsNav = require('./TabsNav');

var TabContainer = require('./TabContainer');
var Config = require('./Config');
var Actions = require('./Actions');

require('./Menu');

var App = React.createClass({

    render: function(){
        return (
            <div className="tab-app">
                <TabsNav/>
                <TabContainer/>
                <PasswordDialog/>
            </div>
        );
    },
});

var app = <App/>;

var theme = (Config.getTheme() || 'dark');
var size = (Config.getFontSize() || 'medium');
Actions.setTheme(theme);
Actions.setFontSize(size);

React.render(app, mountNode);
