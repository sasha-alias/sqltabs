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
                { tabsHtml }
            </div>
        );
    }
});

module.exports = TabContainer;
