/*
  Copyright (C) 2015  Aliaksandr Aliashkevich
  
      This program is free software: you can redistribute it and/or modify
      it under the terms of the GNU General Public License as published by
      the Free Software Foundation, either version 3 of the License, or
      (at your option) any later version.
  
      This program is distributed in the hope that it will be useful,
      but WITHOUT ANY WARRANTY; without even the implied warranty of
      MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
      GNU General Public License for more details.
  
      You should have received a copy of the GNU General Public License
      along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

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
