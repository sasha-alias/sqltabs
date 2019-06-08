
var Actions = require('./../../Actions');
var React = require('react'); // eslint-disable-line no-unused-vars

var Renderer = {

    info: function(tabid, info, getFunction){ // eslint-disable-line no-unused-vars
        if (info.object_type == "database"){
            const collections = info.object.collections.map( (item, i) => {
                const script = `collection("`+item+`")
    .limit(100)
    .select()`;
                return <li key={i}>
                    <a href="#" onClick={ ()=> {Actions.newTab(script) } }>{item}</a>
                    </li>
            });
            return <div className="object-info-div"> Collections:
                <ul>
                    {collections}
                </ul>

            </div>
        }
    },

}

module.exports = Renderer;

