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
var Actions = require('./Actions');
var TabsStore = require('./TabsStore');
var ConnInput = require('./ConnInput');
var ColorPicker = require('react-color').CirclePicker;

var TabToolbar = React.createClass({

    getInitialState: function(){
        var color = TabsStore.getConnectionColor();
        return {
            background: color,
            displayColorPicker: false,
        };

    },

    componentDidMount: function(){
        TabsStore.bind('change', this.storeChangedHandler);
        window.addEventListener('click', this.globalClickHandler);
    },

    componentWillUnmount: function(){
        TabsStore.unbind('change', this.storeChangedHandler);
        window.removeEventListener('click', this.globalClickHandler);
    },

    storeChangedHandler: function(){
        var color = TabsStore.getConnectionColor();
        this.setState({background: color});
    },

    toggleProject: function(){
        Actions.toggleProject();
    },

    toggleTheme: function(){
        if (TabsStore.theme == 'dark'){
            Actions.setTheme('bright');
        } else {
            Actions.setTheme('dark');
        }
    },

    toggleColorPicker: function(e){
        e.preventDefault();
        e.stopPropagation();
        this.setState({displayColorPicker: !this.state.displayColorPicker});
    },

    clearColor: function(){
        this.setState({background: 'inherit', displayColorPicker: false});
        TabsStore.saveConnectionColor(null);
        Actions.connectionColorChange();
    },

    colorChangeHandler: function(color){
        if (color == null){
            this.setState({background: 'inherit', displayColorPicker: false});
            TabsStore.saveConnectionColor(color);
        } else {
            this.setState({background: color.hex, displayColorPicker: false});
            TabsStore.saveConnectionColor(color.hex);
        }
        Actions.connectionColorChange();
    },

    globalClickHandler: function(){
        // hide color picker when clicked outside
        if (this.state.displayColorPicker){
            this.setState({displayColorPicker: false});
        }
    },

    render: function(){

        var color_picker = null;
        if (this.state.displayColorPicker){
            color_picker = <div className="color-picker" id="color-picker">
              <ColorPicker color={ this.state.background } onChange={ this.colorChangeHandler} />
              <div className="clear-color" onClick={this.clearColor}> Clear </div>
            </div>;
        }

        return (
        <div className="tab-toolbar" style={{background: this.state.background}}>
            <div className="toolbar-button" onClick={this.toggleProject}><span className="glyphicon glyphicon-menu-hamburger"/></div>
            <ConnInput eventKey={this.props.eventKey}/>
            <div className="toggle-theme-button" onClick={this.toggleTheme}><span className="glyphicon glyphicon-adjust"/></div>
            <div className="conn-color-button" onClick={this.toggleColorPicker}><span className="glyphicon glyphicon-tint"/></div>
            {color_picker}
        </div>
        );
    },

});

module.exports = TabToolbar;
