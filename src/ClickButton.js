var Button = require('react-bootstrap').Button;

var ClickButton = React.createClass({

    render: function(){
        return <div onClick={this.props.clickHandler}>
            <Button bsStyle={this.props.bsStyle} bsSize={this.props.bsSize}>{this.props.children}</Button>
            </div>
    }
})


module.exports = ClickButton;
