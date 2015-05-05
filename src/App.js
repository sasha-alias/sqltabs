var React = require('react');
var mountNode = document.body;

var TabsNav = require('./TabsNav');

var TabContainer = require('./TabContainer');
var Config = require('./Config');
var Actions = require('./Actions');

require('./Menu');

var App = 
<div className="tab-app">
<TabsNav/>
<TabContainer/>
</div>
;

var theme = (Config.getTheme() || 'dark');
Actions.setTheme(theme);

React.render(App, mountNode);
