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
var ReactDOM = require('react-dom');
var TabActions = require('./Actions');
var TabsStore = require('./TabsStore');

var Splitter = React.createClass({

    render: function(){
        var classname;
        if (this.props.type == 'horizontal'){
            classname = "hsplitter";
        } else if (this.props.type == "vertical" ) {
            classname = "vsplitter";
        } else  {
            return <div style={{widht: '0%', height: '0%'}}/>;
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
        return (
        <div className="tab-split-container" style={this.props.style}>
            {this.props.children}
        </div>
        );
    },
});

var TabSplit = React.createClass({

    getInitialState: function(){

        var type = this.props.type;
        if (typeof(this.props.type) == 'undefined'){
            type = "horizontal";
        }

        return {
            drag: false,
            type: type,
            project_visible: false,
        };
    },

    main_container: null,
    first_container: null,
    second_container: null,
    splitter: null,

    horizontalResize: function(e){
        var main_size = this.main_container.getBoundingClientRect();
        var h1 = e.pageY - this.first_container.getBoundingClientRect().top;
        var h_max = main_size.bottom - main_size.top - e.pageY;
        var h2 = this.main_container.getBoundingClientRect().height - h1 - this.splitter.getBoundingClientRect().height;

        if (h1 > 15 && h_max > 15) {
            this.first_container.style.width = "100%";
            this.second_container.style.width = "100%";
            this.first_container.style.height = h1/main_size.height*100+'%';
            this.second_container.style.height = h2/main_size.height*100+'%';
            TabActions.resize(this.props.eventKey);
        }
    },

    verticalResize: function(e){
        var main_size = this.main_container.getBoundingClientRect();
        var w1 = e.pageX - this.first_container.getBoundingClientRect().left;
        var w_max = main_size.right - e.pageX;
        var w_main = this.main_container.getBoundingClientRect().width;
        var w_splitter = this.splitter.getBoundingClientRect().width;
        var w2 = w_main - w1 - w_splitter;

        if (w1 > 15 && w_max > 15) {
            this.first_container.style.height = "100%";
            this.second_container.style.height = "100%";
            this.first_container.style.width = w1/main_size.width*100+'%';
            this.second_container.style.width = w2/main_size.width*100+'%';
            TabActions.resize(this.props.eventKey);
        }
    },

    componentDidMount: function(){

        if (this.props.project){
            TabsStore.bind('show-project-'+this.props.eventKey, this.showProjectHandler);
            TabsStore.bind('hide-project-'+this.props.eventKey, this.hideProjectHandler);
            TabsStore.bind('toggle-project-'+this.props.eventKey, this.toggleProjectHandler);
        } else {
            TabsStore.bind('switch-view-'+this.props.eventKey, this.switchViewHandler);
        }

        // the following is important, we reset outer container height from percents to pixels
        // this way it becomes fixed and inner containers are not overflowing it in case of long content
        this.main_container.style.height = this.main_container.getBoundingClientRect().height+'px';
    },


    componentDidUpdate: function(){
        if (this.make_resize){
            this.make_resize = false;
        }
        // the following is important, we reset outer container height from percents to pixels
        // this way it becomes fixed and inner containers are not overflowing it in case of long content
        this.main_container.style.height = this.main_container.getBoundingClientRect().height+'px';
    },

    componentWillUnmount: function(){
        if (this.props.project){
            TabsStore.unbind('show-project-'+this.props.eventKey, this.showProjectHandler);
            TabsStore.unbind('hide-project-'+this.props.eventKey, this.hideProjectHandler);
            TabsStore.unbind('toggle-project-'+this.props.eventKey, this.toggleProjectHandler);
        } else {
            TabsStore.unbind('switch-view-'+this.props.eventKey, this.switchViewHandler);
        }
        window.removeEventListener('resize', this.windowResizeHandler);
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
        if (this.state.type == 'horizontal'){
            this.horizontalResize(e);
        } else { // vertical
            this.verticalResize(e);
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

        var splitter_type;
        var first_style;
        var second_style;
        var flex_direction;

        if (this.props.project){ // for project window
            flex_direction = 'row';

            if (this.state.project_visible){
                splitter_type = "vertical";
                first_style = {
                    width: "20%",
                    height: "100%",
                    minHeight: "100%",
                };
                second_style = {
                    flex: 1,
                };
            } else {
                splitter_type = "invisible";
                first_style = {
                    width: "0%",
                    height: "100%",
                    minHeight: "100%",
                };
                second_style = {
                    flex: 1,
                };
            }

        } else { // for sql area

            if (this.state.type == 'vertical'){
                flex_direction = 'row';
                first_style = {
                    width: "50%",
                    height: "100%",
                };
                second_style = {
                    height: "100%",
                    flex: "1",
                };
            } else {
                flex_direction = 'column';
                first_style = {
                    width: "100%",
                    height: "50%",
                };
                second_style = {
                    width: "100%",
                    flex: "1",
                };
            }
            splitter_type = this.state.type;
        }

        var main_style = {
            width: "100%",
            height: "100%",
            minHeight: "100%",
            flexDirection: flex_direction,
        }


        return (
        <div className="tab-split"
          ref={ item => { this.main_container = ReactDOM.findDOMNode(item); } }
          style={ main_style }
          onMouseMove={this.mouseMoveHandler}
          onMouseUp={this.mouseUpHandler}
          onMouseLeave={this.mouseLeaveHandler}
        >

          <Container ref={ item => { this.first_container = ReactDOM.findDOMNode(item); } } type={this.state.type} style={first_style}>
            {this.props.children[0]}
          </Container>

          <Splitter ref={ item => { this.splitter = ReactDOM.findDOMNode(item); } } type={splitter_type}
              mouseDownHandler={this.mouseDownHandler}
          />

          <Container ref={ item => { this.second_container = ReactDOM.findDOMNode(item); } } type={this.state.type} style={second_style}>
            {this.props.children[1]}
          </Container>

        </div>
        );

    },
});


module.exports = TabSplit;
