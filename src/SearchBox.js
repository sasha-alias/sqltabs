var React = require('react');

var Actions = require('./Actions');
var TabsStore = require('./TabsStore');

var SearchBox = React.createClass({

    getInitialState: function(){
        return {visible: false};
    },

    componentDidMount: function(){
        TabsStore.bind('toggle-find-box', this.toggleVisibility);
    },

    toggleVisibility: function(){
        this.setState({visible: TabsStore.searchVisible})
        if (this.state.visible){
            var searchInput = React.findDOMNode(this.refs.searchInput)
            searchInput.focus();
            searchInput.select();
        }
    },

    submitHandler: function(e){
        var searchInput = React.findDOMNode(this.refs.searchInput)
        e.preventDefault();
        e.stopPropagation();
        Actions.editorFindNext(searchInput.value);
    },

    keyPressHandler: function(e){
        if (e.keyCode == 27) { // esc
            Actions.toggleFindBox();
            e.preventDefault();
            e.stopPropagation();
        }
    },

    render: function(){
        if (this.state.visible){
            return (
            <div className="search-box">
                <form className="tab-toolbar-form" onSubmit={this.submitHandler}>
                    <input
                        className="search-input form-control"
                        ref="searchInput"
                        type="text" 
                        placeholder="Search"
                        onKeyDown={this.keyPressHandler}
                    /> 
                </form>
            </div>);
        } else {
            return (<div/>);
        }
    },
});

module.exports = SearchBox;
