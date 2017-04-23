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

var Settings = React.createClass({

    getInitialState: function(){
        return {
            theme: TabsStore.theme,
            mode: TabsStore.mode,
            fontSize: TabsStore.fontSize,
            showQuery: TabsStore.showQuery,
            autoCompletion: TabsStore.auto_completion,
            schemaFilter: TabsStore.schemaFilter,
            schemaFilterMode: TabsStore.schemaFilterMode,
            schemaFilterRegEx: TabsStore.schemaFilterRegEx,
        };
    },

    storeChangedHandler: function(){
        this.setState(this.getInitialState());
    },

    componentDidMount: function() {
        TabsStore.bind('change-theme', this.storeChangedHandler);
        TabsStore.bind('change-mode', this.storeChangedHandler);
        TabsStore.bind('font-size-changed', this.storeChangedHandler);
        TabsStore.bind('change-show-query', this.storeChangedHandler);
        TabsStore.bind('change-auto-completion', this.storeChangedHandler);
        TabsStore.bind('change-schema-filter', this.storeChangedHandler);
    },

    componentWillUnmount: function() {
        TabsStore.unbind('change-theme', this.storeChangedHandler);
        TabsStore.unbind('change-mode', this.storeChangedHandler);
        TabsStore.unbind('font-size-changed', this.storeChangedHandler);
        TabsStore.unbind('change-show-query', this.storeChangedHandler);
        TabsStore.unbind('change-auto-completion', this.storeChangedHandler);
        TabsStore.unbind('change-schema-filter', this.storeChangedHandler);
    },

    setTheme: function(ev) {
        Actions.setTheme(ev.target.value);
    },

    setMode: function(ev) {
        Actions.setMode(ev.target.value);
    },

    setFontSize: function(ev) {
        Actions.setFontSize(ev.target.value);
    },

    setSchemaFilterMode: function(ev) {
        Actions.setSchemaFilterMode(ev.target.value);
    },

    setSchemaFilterRegEx: function(ev) {
        Actions.setSchemaFilterRegEx(ev.target.value);
    },

    setEcho: function(ev) {
        TabsStore.setEcho(ev.target.checked);
    },

    setAutoCompletion: function(ev) {
        TabsStore.setAutocompletion(ev.target.checked);
    },

    enableSchemaFilter: function(ev) {
        Actions.enableSchemaFilter(ev.target.checked);
    },

    getSchemaFilterAdvanced: function() {
        if (this.state.schemaFilter) {
            return (
                <blockquote>
                    <label htmlFor="schema-filter-mode-select">Filter mode</label>
                    <select id="schema-filter-mode-select" className="form-control" value={this.state.schemaFilterMode} onChange={this.setSchemaFilterMode}>
                        <option value="white">Whitelist</option>
                        <option value="black">Blacklist</option>
                    </select>
                    <label htmlFor="schema-filter-regex-input">Filter regex</label>
                    <input type="text" className="form-control" placeholder=".*text.*" value={this.state.schemaFilterRegEx} onChange={this.setSchemaFilterRegEx}/>
                </blockquote>
            )
        }
        return null
    },

    render: function(){

        return (
            <div style={{padding: '30px'}}>
                <h1>Settings</h1>
                <div className="form-group">
                    <label htmlFor="theme-select">Theme</label>
                    <select id="theme-select" className="form-control" value={this.state.theme} onChange={this.setTheme}>
                        <option value="dark">Dark</option>
                        <option value="bright">Bright</option>
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="mode-select">Mode</label>
                    <select id="mode-select" className="form-control" value={this.state.mode} onChange={this.setMode}>
                        <option value="classic">Classic</option>
                        <option value="vim">Vim</option>
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="font-select">Font</label>
                    <select id="font-select" className="form-control" value={this.state.fontSize} onChange={this.setFontSize}>
                        <option value="x-small">X-Small</option>
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                        <option value="x-large">X-Large</option>
                        <option value="xx-large">XX-Large</option>
                    </select>
                </div>
                <div className="checkbox">
                    <label>
                        <input type="checkbox" value="true" checked={this.state.showQuery} onChange={this.setEcho} />
                        Output echo
                    </label>
                </div>
                <div className="checkbox">
                    <label>
                        <input type="checkbox" value="true" checked={this.state.schemaFilter} onChange={this.enableSchemaFilter} />
                        Enable schema filter
                    </label>
                </div>
                {this.getSchemaFilterAdvanced()}
                <div className="checkbox">
                    <label>
                        <input type="checkbox" value="true" checked={this.state.autoCompletion} onChange={this.setAutoCompletion} />
                        Auto-completion
                    </label>
                </div>
            </div>
        )

    }
});

module.exports = Settings;
