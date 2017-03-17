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
        };
    },

    componentDidMount: function() {
        TabsStore.bind('change-theme', this.storeChangedHandler);
        TabsStore.bind('change-mode', this.storeChangedHandler);
        TabsStore.bind('font-size-changed', this.storeChangedHandler);
    },

    componentWillUnmount: function() {
        TabsStore.unbind('change-theme', this.storeChangedHandler);
        TabsStore.unbind('change-mode', this.storeChangedHandler);
        TabsStore.unbind('font-size-changed', this.storeChangedHandler);
    },

    storeChangedHandler: function(){
        this.setState({
            theme: TabsStore.theme,
            mode: TabsStore.mode,
            fontSize: TabsStore.fontSize,
        });
    },

    setTheme(ev) {
        Actions.setTheme(ev.target.value);
    },

    setMode(ev) {
        Actions.setMode(ev.target.value);
    },

    setFontSize(ev) {
        Actions.setFontSize(ev.target.value);
    },

    setEcho(ev) {
        TabsStore.setEcho(ev.target.checked);
    },

    render(){

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
                        <input type="checkbox" value="option1" />
                        Enable filter
                    </label>
                </div>
                <div className="checkbox">
                    <label>
                        <input type="checkbox" value="option1" />
                        Auto-completation
                    </label>
                </div>
            </div>
        )

    }
});

module.exports = Settings;
