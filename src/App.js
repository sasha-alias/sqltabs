var React = require('react');
var gui = window.require('nw.gui');
var mountNode = global.document.body;

var TabsNav = require('./TabsNav');
var TabContainer = require('./TabContainer');
var Config = require('./Config');
var Actions = require('./Actions');

require('./Menu.js');

var App = 
<div className="tab-app">
<TabsNav/>
<TabContainer/>
</div>
;

var theme = (Config.getTheme() || 'dark');
var win = gui.Window.get();
win.maximize();
Actions.setTheme(theme);

React.render(App, mountNode);
