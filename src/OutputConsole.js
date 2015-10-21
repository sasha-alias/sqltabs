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
var Chart = require('./Chart');
var ObjectInfo = require('./ObjectInfo');
var Marked = require('marked');
var Shell = require('shell');
var Actions = require('./Actions');
var SqlDoc = require('sqldoc');

var OutputConsole = React.createClass({

    getInitialState: function(){

        return {
        message: " ",
        result: null,
        error: null,
        updatable: true,
        };
    },

    shouldComponentUpdate: function(){
        // prevent component re-render after result have been rendered
        // so the resultset is rendered only once after execution
        // otherwise it will recalculate state on every action in app, which is slow on large datasets
        return this.state.updatable;
    },
    
    componentDidMount: function(){
        TabsStore.bind('query-started-'+this.props.eventKey, this.queryStarted);
        TabsStore.bind('query-finished-'+this.props.eventKey, this.queryFinished);
        TabsStore.bind('query-error-'+this.props.eventKey, this.queryError);
        TabsStore.bind('object-info-received-'+this.props.eventKey, this.objectInfoReceived);
    },

    componentDidUpdate: function(){
        mount_charts();
    },

    componentWillUnmount: function(){
        clearInterval(this.timer);
        TabsStore.unbind('query-started-'+this.props.eventKey, this.queryStarted);
        TabsStore.unbind('query-finished-'+this.props.eventKey, this.queryFinished);
        TabsStore.unbind('query-error-'+this.props.eventKey, this.queryError);
        TabsStore.unbind('object-info-received-'+this.props.eventKey, this.objectInfoReceived);
    },

    tick: function(){
        var time = Math.round((this.state.executing + 0.1)*10)/10;
        this.setState({message: "# Executing ... "+time+"s", executing: time,});
    },

    queryStarted: function(){
        if (typeof(this.timer) != 'undefined'){
            clearInterval(this.timer);
        }
        this.setState({updatable: true}, function(){    // first make component updatable
            this.setState({                             // second change state so it's get rerendered
                message: "# Executing ...", 
                result: null,
                error: null,
                info: null,
                executing: 0,
            }, function(){
                this.timer = setInterval(this.tick, 100);
            }); 
        }
        );  
    },

    queryFinished: function(){
        clearInterval(this.timer);

        this.setState({
            message: null,
            result: TabsStore.getResult(this.props.eventKey), 
            error: null,
            info: null,
            updatable: false,
        });
    },

    queryError: function(){
        clearInterval(this.timer);
        this.setState({error: TabsStore.getError(this.props.eventKey)});
    },

    share: function(){
        Actions.shareDialog();
    },

    objectInfoReceived: function(){
        clearInterval(this.timer);
        this.setState({updatable: true}, function(){ // first make component updatable
            this.setState({
                message: null,
                result: null,
                error: null,
                info: TabsStore.getObjectInfo(),
                updatable: false,
            });
        });   
    },

    getRenderer: function(query){
        if (TabsStore.getRenderer() == 'auto'){
            if (query.match('^\\s*---\\s+chart\s*.*') != null){
                return this.renderChart;
            } else {
                return this.renderDataset;
            }
        } else {
            return this.renderDataset;
        }
    },

    render: function(){
        if (this.state.error){
            return this.renderError();
        } else if (this.state.message){
            return this.renderMessage();
        } else if (this.state.info){
            return this.renderInfo();
        } else {
            return this.renderResult();
        }
    },

    renderError: function(){
        return (
        <div className="output-console">
            <div className="connection-error alert alert-danger">{this.state.error.toString()}</div>
        </div>
        );
    },

    renderMessage: function(){
        return (
            <div className="output-console">
            <span className="output-message">{this.state.message}</span>
            </div>
        );
    },

    renderResult: function(){

        if (TabsStore.getRenderer() == 'auto'){
            var output = 'document';
        } else {
            var output = 'script';
        }
        var sqldoc = React.createElement(SqlDoc, {
            data: this.state.result, 
            buttonBar: true, 
            eventKey: this.props.eventKey, 
            output: output,
            onShare: this.share,
            });

        return sqldoc;
    },


    renderInfo: function(){
        if (this.state.info.object != null){ //???????
            var id = this.state.info.object_name;//+'_'+this.state.info.object.columns.length;
        } else {
            var id = this.state.info.object_name;
        }
        return (
            <div id={"output-console-"+this.props.eventKey} className="output-console">
                <ObjectInfo key={id} info={this.state.info} eventKey={this.props.eventKey}/>
            </div>
        );
    }
});

module.exports = OutputConsole;
