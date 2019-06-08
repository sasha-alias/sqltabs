
var React = require('react'); // eslint-disable-line no-unused-vars

var Renderer = {

    info: function(tabid, info, getFunction){

        if (info.object_type == "database"){
            return this.renderDatabaseInfo(tabid, info, getFunction);
        } else {
            return <div className="alert alert-danger"> Info about "{info.object_name}" either not found or not supported yet </div>
        }
    },

    renderDatabaseInfo: function(tabid, info, getFunction){

        var schemas = info.object.schemas.map(function(item, idx){
            var id = "schema_"+tabid+"_"+idx;
            return <li key={id}><a href="#" onClick={function(){getFunction(item+'.');}}>{item}</a></li>
        });

        return(
            <div className="object-info-div" id={"schemas-"+tabid}> Schemas:
                <ul>
                    {schemas}
                </ul>
            </div>
        );
    },

}

module.exports = Renderer;

