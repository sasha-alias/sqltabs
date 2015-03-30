var React = require('react');
var $ = require('jquery');
var TabActions = require('./Actions');

var Splitter = React.createClass({
    render: function(){
        return (
            <div className="hsplitter" 
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
        <div className="tab-split-container" style={{height: this.props.h}}>
            {this.props.children}
        </div>
        );
    },
});

var TabSplit = React.createClass({

    getInitialState: function(){

        return {
            drag: false, 
            h1: "50%", 
            h2: "50%"};
    },

    mouseDownHandler: function(e){
        var pos = $(this.getDOMNode()).offset();
        this.setState({
          drag: true,
        });

        e.stopPropagation();
        e.preventDefault();
    },

    mouseMoveHandler: function(e){

        var pos = $(this.getDOMNode()).offset();
        var h = $(this.getDOMNode()).height();

        if (this.state.drag){

            var h1 = e.pageY - pos.top;
            var h2 = h - h1;
            if (h1 > 15 && h2 > 15) {
                this.setState({
                    h1: h1,
                    h2: h2,
                    });
                TabActions.resize(this.props.eventKey);
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
        return (
        <div className="tab-split"
          onMouseMove={this.mouseMoveHandler}
          onMouseUp={this.mouseUpHandler}
          onMouseLeave={this.mouseLeaveHandler}
        >
          <Container h={this.state.h1}> 
            {this.props.children[0]}
          </Container>
          <Splitter 
              mouseDownHandler={this.mouseDownHandler}
          />
          <Container h={this.state.h2}>
            {this.props.children[1]}
          </Container>
        </div>
        );
    },
});


module.exports = TabSplit;
