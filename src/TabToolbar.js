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

var TabToolbar = React.createClass({

    toggleProject: function(){
        Actions.toggleProject();
    },

    render: function(){

        return (
        <div className="tab-toolbar"> 
            <div className="toolbar-button" onClick={this.toggleProject}><span className="glyphicon glyphicon-menu-hamburger"/></div>
            <ConnInput eventKey={this.props.eventKey}/>
        </div>
        );
    },

});

module.exports = TabToolbar;
