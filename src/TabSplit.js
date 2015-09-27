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
var $ = require('jquery');
var TabActions = require('./Actions');
var TabsStore = require('./TabsStore');

var Splitter = React.createClass({

    render: function(){
        if (this.props.type == 'horizontal'){
            var classname = "hsplitter";
        } else if (this.props.type == "vertical" ) {
            var classname = "vsplitter";
        } else {
            return null;
        }

        return (
            <div className={classname}
                onMouseDown={this.props.mouseDownHandler}
                onMouseMove={this.props.mouseMoveHandler}
                onMouseUp={this.props.mouseUpHandler}
            />
        );
    }
});

var Container = React.createClass({

    render: function(){
        if (this.props.type == "horizontal"){
            return (
            <div className="tab-split-container" style={{width: '100%', height: this.props.h}}>
                {this.props.children}
            </div>
            );
        } else {
            return (
            <div className="tab-split-container" style={{width: this.props.h, height: '100%'}}>
                {this.props.children}
            </div>
            );
        }
    },
});

var TabSplit = React.createClass({

    getInitialState: function(){

        if (typeof(this.props.type) == 'undefined'){
            var type = "horizontal";
        } else {
            var type = this.props.type;
        }

        if (typeof(this.props.h1) == 'undefined'){
            var h1 = "50%";
            var h2 = "calc(50% - 5px)";
        } else {
            var h1 = this.props.h1;
            var h2 = "calc(100% - 5px - "+this.props.h1+")";
        }

        if (this.props.project){
            h1 = 0;
            h2 = "calc(100% - 5px)";
        }

        return {
            drag: false, 
            h1: h1,
            h2: h2,
            type: type,
            project_visible: false,
        };
    },

    componentDidMount: function(){
        if (this.props.project){
            TabsStore.bind('show-project-'+this.props.eventKey, this.showProjectHandler);
            TabsStore.bind('hide-project-'+this.props.eventKey, this.hideProjectHandler);
            TabsStore.bind('toggle-project-'+this.props.eventKey, this.toggleProjectHandler);
        } else {
            TabsStore.bind('switch-view-'+this.props.eventKey, this.switchViewHandler);
        }
    },

    componentWillUnmount: function(){
        if (this.props.project){
            TabsStore.unbind('show-project-'+this.props.eventKey, this.showProjectHandler);
            TabsStore.unbind('hide-project-'+this.props.eventKey, this.hideProjectHandler);
            TabsStore.unbind('toggle-project-'+this.props.eventKey, this.toggleProjectHandler);
        } else {
            TabsStore.unbind('switch-view-'+this.props.eventKey, this.switchViewHandler);
        }
    },

    switchViewHandler: function(){
        if (this.state.type == 'horizontal'){
            this.setState({
                h1: '50%',
                h2: 'calc(50% - 5px)',
                type: 'vertical'
            });
        } else {
            this.setState({
                h1: '50%',
                h2: 'calc(50% - 5px)',
                type: 'horizontal'
            });
        }
        TabActions.resize(this.props.eventKey);
    },

    showProjectHandler: function(){
        this.setState({
            h1: '20%',
            h2: 'calc(80% - 5px)',
            project_visible: true,
        });
    },

    hideProjectHandler: function(){
        this.setState({
            h1: 0,
            h2: "calc(100% - 5px)",
            project_visible: false,
        });
    },

    toggleProjectHandler: function(){
        if (this.state.project_visible){
            this.hideProjectHandler();
        } else {
            this.showProjectHandler();
        }
    },

    mouseDownHandler: function(e){
        this.setState({
          drag: true,
        });

        e.stopPropagation();
        e.preventDefault();
    },

    mouseMoveHandler: function(e){

        if (this.state.type == 'horizontal'){
            var pos = $(this.getDOMNode()).offset();
            var h = $(this.getDOMNode()).height();

            if (this.state.drag){

                var h1 = e.pageY - pos.top;
                var h2 = h - h1 - 5;
                if (h1 > 15 && h2 > 15) {
                    this.setState({
                        h1: h1,
                        h2: h2,
                        });
                    TabActions.resize(this.props.eventKey);
                }
            }
        } else { // vertical
            var pos = $(this.getDOMNode()).offset();
            var h = $(this.getDOMNode()).width();

            if (this.state.drag){

                var h1 = e.pageX - pos.left;
                var h2 = h - h1 - 5;
                if (h1 > 15 && h2 > 15) {
                    this.setState({
                        h1: h1,
                        h2: h2,
                        });
                    TabActions.resize(this.props.eventKey);
                }
            }
        }
    },

    mouseUpHandler: function(e){
        this.setState({drag: false});
        e.stopPropagation();
        e.preventDefault();
    },

    mouseLeaveHandler: function(e){
        this.setState({drag: false});
        e.stopPropagation();
        e.preventDefault();
    },

    render: function(){

        if (this.props.project && !this.state.project_visible){
            var splitter_type = "invisible"; 
        } else {
            var splitter_type = this.state.type;
        }

        return (
        <div className="tab-split"
          onMouseMove={this.mouseMoveHandler}
          onMouseUp={this.mouseUpHandler}
          onMouseLeave={this.mouseLeaveHandler}
        >
          <Container type={this.state.type} h={this.state.h1}> 
            {this.props.children[0]}
          </Container>
          <Splitter type={splitter_type}
              mouseDownHandler={this.mouseDownHandler}
          />
          <Container type={this.state.type} h={this.state.h2}>
            {this.props.children[1]}
          </Container>
        </div>
        );

    },
});


module.exports = TabSplit;
