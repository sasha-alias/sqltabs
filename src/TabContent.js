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
var OutputConsole = require('./OutputConsole');
var TabSplit = require('./TabSplit');
var Editor = require('./Editor');
var TabToolbar = require('./TabToolbar');
var SearchBox = require('./SearchBox');

var TabContent = React.createClass({

    getInitialState: function(){
        return {
            theme: TabsStore.theme
        };
    },

    componentDidMount: function() {  
        TabsStore.bind('change', this.storeChangedHandler);
    },

    componentWillUnmount: function() {  
        TabsStore.unbind('change', this.storeChangedHandler);
    },

    storeChangedHandler: function(){
        this.setState({
            theme: TabsStore.theme
        });
    },

    render: function(){

        var cls = (this.props.visible) ? 'tab-content': 'tab-content hidden';

        return (

            <div className={cls}>

                <TabToolbar eventKey={this.props.eventKey}/>

                <TabSplit eventKey={this.props.eventKey}>

                    <Editor name={'editor-'+this.props.eventKey} theme={this.state.theme} eventKey={this.props.eventKey}/>

                    <OutputConsole eventKey={this.props.eventKey}/>

                </TabSplit>

                <SearchBox eventKey={this.props.eventKey}/>

            </div>
        );
    }
});

module.exports = TabContent;
