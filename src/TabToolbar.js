var React = require('react');
var TabActions = require('./Actions');
var TabsStore = require('./TabsStore');
var ConnInput = require('./ConnInput');

var TabToolbar = React.createClass({

    render: function(){

        return (
        <div className="tab-toolbar"> 
            <ConnInput eventKey={this.props.eventKey}/>
        </div>
        );
    },

});

module.exports = TabToolbar;
