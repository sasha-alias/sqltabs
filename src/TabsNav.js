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
var Nav = require('react-bootstrap').Nav;
var NavItem = require('react-bootstrap').NavItem;
var Button = require('react-bootstrap').Button;

var TabsStore = require('./TabsStore');

var TabActions = require('./Actions');

var CloseButton = React.createClass({

    clickHandler: function(){
        TabActions.close(this.props.eventKey);
    },

    render: function(){
        return (
        <span className="tab-close-button" onClick={this.clickHandler}>
            <Button bsSize="xsmall" bsStyle="link">
                <span className="glyphicon glyphicon-remove-circle" aria-hidden="true"></span>
            </Button>
        </span>
        );
    },
});

var TabsNav = React.createClass({

    getInitialState: function(){

        return {
            tabs: TabsStore.getAll(),
            order: TabsStore.order,
            selectedTab: TabsStore.selectedTab,
            colors: this.getColors(),
        };
    },

    componentDidMount: function() {
        TabsStore.bind('change', this.listChanged);
        TabsStore.bind('connection-color-change', this.colorChangeHandler);
    },

    componentWillUnmount: function() {
        TabsStore.unbind('change', this.listChanged);
        TabsStore.unbind('connection-color-change', this.colorChangeHandler);
    },

    listChanged: function() {
        this.setState({
            tabs: TabsStore.getAll(),
            order: TabsStore.order,
            selectedTab: TabsStore.selectedTab,
        });
    },

    getColors: function(){
        var colors = {};
        for (var item in TabsStore.order){
            var connstr = TabsStore.getConnstr(item);
            var connectionColor = TabsStore.getConnectionColor(connstr);
            colors[connstr] = connectionColor;
        }
        return colors;
    },

    colorChangeHandler: function(){
        this.setState({colors: this.getColors()});
    },

    selectHandler: function(key) {
        TabActions.select(key);
    },

    render: function(){
        var items = this.state.order;
        var tabs = this.state.tabs;
        var itemHtml = items.map( function(item) {

                var connstr = TabsStore.getConnstr(item);
                var connectionColor = TabsStore.getConnectionColor(connstr);
                var color_circle = <span className="connection-color-circle" style={{background: connectionColor}}> &nbsp; </span>

                var title = <span className="tab-title">
                    {tabs[item].getTitle()}
                </span>
                return <NavItem key={item} eventKey={item}>
                    {color_circle}
                    {title}
                    <CloseButton eventKey={item}/>
                </NavItem>;
            });

        return (
        <div className="tab-navigator">
        <Nav bsStyle="tabs" activeKey={this.state.selectedTab} onSelect={this.selectHandler}>
            {itemHtml}

            <NavItem eventKey={0}>+</NavItem>

        </Nav>
        </div>
        )
    },
})

module.exports = TabsNav;
