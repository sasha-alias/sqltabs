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
            <div className="tab-split-container" style={{width: '100%'}}>
                {this.props.children}
            </div>
            );
        } else {
            return (
            <div className="tab-split-container">
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

        return {
            drag: false,
            type: type,
            project_visible: false,
        };
    },

    setInitialSize: function(){
        var main_container = $(this.getDOMNode());
        var first_container = $(this.refs.first_container.getDOMNode());
        var second_container = $(this.refs.second_container.getDOMNode());

        main_container.height($(document).height() - main_container.offset().top);

        if (typeof(this.props.type) == 'undefined' || this.props.type == 'horizontal'){
        // horizontally split editor area
            var h1 = $(document).height()/3;
            first_container.height(h1);
            first_container.width('100%');
            var h2 = $(document).height() - second_container.offset().top;
            second_container.height(h2);
            second_container.width('100%');
        } else {
        // vertically split project area
            first_container.width('0px');
            first_container.height(main_container.height());
            second_container.width('100%');
            second_container.height(main_container.height());
        }
    },

    resizeContainers: function(){
        var main_container = $(this.getDOMNode());
        var first_container = $(this.refs.first_container.getDOMNode());
        var second_container = $(this.refs.second_container.getDOMNode());
        var splitter = $(this.refs.splitter.getDOMNode());

        main_container.height($(document).height() - main_container.offset().top);

        if (this.state.resize_type == 'show_project') {
            first_container.width('20%');
            second_container.width(main_container.width() - first_container.width() - 5);
            splitter.height(main_container.height());
        }

        if (this.state.resize_type == 'hide_project') {
            first_container.width('0px');
            second_container.width(main_container.width());
        }

        if (this.state.resize_type == 'switch_view') {
            if (this.state.type == 'horizontal'){
                var h1 = $(document).height()/3;
                first_container.width('100%');
                first_container.height(h1);
                var h2 = $(document).height() - first_container.offset().top - first_container.height() - 8;
                second_container.width('100%');
                second_container.height(h2);
            } else { // vertical
                first_container.width(main_container.width()/2);
                first_container.height($(document).height() - main_container.offset().top);
                second_container.width(main_container.width()/2 - 5);
                second_container.height($(document).height() - main_container.offset().top);
            }
        }
    },

    horizontalResize: function(e){
        var main_container = $(this.getDOMNode());
        var first_container = $(this.refs.first_container.getDOMNode());
        var second_container = $(this.refs.second_container.getDOMNode());

        var h1 = e.pageY - first_container.offset().top;
        var h2 = main_container.height() - h1;
        if (h1 > 15 && h2 > 15) {
            first_container.height(h1);
            second_container.height($(document).height() - first_container.offset().top - h1 - 8);
            TabActions.resize(this.props.eventKey);
        }
    },

    verticalResize: function(e){
        var main_container = $(this.getDOMNode());
        var first_container = $(this.refs.first_container.getDOMNode());
        var second_container = $(this.refs.second_container.getDOMNode());

        var w1 = e.pageX - first_container.offset().left;
        var w2 = main_container.width() - w1;
        if (w1 > 15 && w2 > 15) {
            if (this.state.project_visible && w1 > main_container.width()/2){
                return; // project window max width 50%
            }
            first_container.width(w1);
            second_container.width($(document).width() - first_container.offset().left - w1 - 5);
            TabActions.resize(this.props.eventKey);
        }
    },

    componentDidMount: function(){
        var self = this;

        if (this.props.project){
            TabsStore.bind('show-project-'+this.props.eventKey, this.showProjectHandler);
            TabsStore.bind('hide-project-'+this.props.eventKey, this.hideProjectHandler);
            TabsStore.bind('toggle-project-'+this.props.eventKey, this.toggleProjectHandler);
        } else {
            TabsStore.bind('switch-view-'+this.props.eventKey, this.switchViewHandler);
            TabsStore.bind('editor-resize', this.resizeHandler);
        }

        // timeout needed because of some race conditions during window initialization
        // without timeout on linux areas created with wrong size
        setTimeout(function(){
            self.setInitialSize();
        }, 10); 

        // resize areas after window size changed
        window.addEventListener("resize", self.setInitialSize);
    },

    componentDidUpdate: function(){
        if (this.make_resize){
            this.make_resize = false;
            this.resizeContainers();
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
        window.removeEventListener("resize", self.resizeContainers);
    },

    resizeHandler: function(){
        // handle risize of outer container for vertical view
        if (this.state.type == 'vertical' && !this.state.project_visible){
            var first_container = $(this.refs.first_container.getDOMNode());
            var second_container = $(this.refs.second_container.getDOMNode());
            var second_overflow = (first_container.offset().left + first_container.width() + second_container.width() + 5) - $(document).width();
            if ( second_overflow > 0) {
                // reduce second container width
                var w2 = second_container.width() - second_overflow;
                second_container.width(w2);
            } else if (second_overflow < 0) {
                // expand second container width
                var w2 = second_container.width() + second_overflow*-1;
                second_container.width(w2);
            }
        }
    },

    switchViewHandler: function(){
        this.make_resize = true;
        if (this.state.type == 'horizontal'){
            this.setState({
                type: 'vertical',
                resize_type: 'switch_view',
            });
        } else {
            this.setState({
                type: 'horizontal',
                resize_type: 'switch_view',
            });
        }
        TabActions.resize(this.props.eventKey);
    },

    showProjectHandler: function(){
        this.make_resize = true;
        this.setState({
            project_visible: true,
            resize_type: 'show_project',
        });
        TabActions.resize(this.props.eventKey);
    },

    hideProjectHandler: function(){
        this.make_resize = true;
        this.setState({
            project_visible: false,
            resize_type: 'hide_project',
        });
        TabActions.resize(this.props.eventKey);
    },

    toggleProjectHandler: function(){
        if (this.state.project_visible){
            this.hideProjectHandler();
        } else {
            this.showProjectHandler();
        }
    },

    mouseDownHandler: function(e){
        e.stopPropagation();
        e.preventDefault();
        this.setState({drag: true});
    },

    mouseMoveHandler: function(e){

        if (!this.state.drag){
            return;
        }
        var first_container = $(this.refs.first_container.getDOMNode())
        var second_container = $(this.refs.second_container.getDOMNode())

        if (this.state.type == 'horizontal'){
            this.horizontalResize(e);

        } else { // vertical
            this.verticalResize(e);
            //var pos = $(this.getDOMNode()).offset();
            //var h = $(this.getDOMNode()).width();

            //var h1 = e.pageX - pos.left;
            //var h2 = h - h1 - 5;
            //if (h1 > 15 && h2 > 15) {
            //    this.setState({
            //        h1: h1,
            //        h2: h2,
            //        });
            //    TabActions.resize(this.props.eventKey);
            //}
        }
    },

    mouseUpHandler: function(e){
        e.stopPropagation();
        e.preventDefault();
        this.setState({drag: false});
    },

    mouseLeaveHandler: function(e){
        e.stopPropagation();
        e.preventDefault();
        this.setState({drag: false});
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
          <Container ref="first_container" type={this.state.type} h={this.state.h1}>
            {this.props.children[0]}
          </Container>
          <Splitter ref="splitter" type={splitter_type}
              mouseDownHandler={this.mouseDownHandler}
          />
          <Container ref="second_container" type={this.state.type} h={this.state.h2}>
            {this.props.children[1]}
          </Container>
        </div>
        );

    },
});


module.exports = TabSplit;
