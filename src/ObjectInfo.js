var React = require('react');

var ObjectInfo = React.createClass({

    render: function(){
        var info = this.props.info;
        if (info.object_type == 'relation'){
            if (info.object == null){
                return <div className="alert alert-danger"> Relation "{info.object_name}" not found </div>
            }

            if (info.object.relkind == 'r'){relkind = "Table"}
            else if (info.object.relkind == 'i'){relkind = 'Index'}
            else if (info.object.relkind == 'S'){relkind = 'Sequence'}
            else if (info.object.relkind == 'v'){relkind = "View"}
            else if (info.object.relkind == 'm'){relkind = "Materialized View"}
            else if (info.object.relkind == 'c'){relkind = "Type"}
            else if (info.object.relkind == 't'){relkind = "TOAST Table"}
            else if (info.object.relkind == 'f'){relkind = "Foreign Table"}
            else {relkind = ""}

            columns = [];
            columns.push(
                    <tr key="object_info_column_header">
                        <th>Column</th>
                        <th>Type</th>
                        <th>Not Null</th>
                        <th>Default Value</th>
                        <th>&nbsp;</th>
                        <th>Description</th>
                    </tr>
            );
            for (var i=0; i<info.object.columns.length; i++){
                // not null
                if (info.object.columns[i].not_null == 't'){
                    var not_null = <span className="ace_keyword">NOT NULL</span>;
                } else {
                    var not_null = '';
                }
                // type
                if (info.object.columns[i].max_length != '-1'){
                    var type = <span><span className="ace_keyword">{info.object.columns[i].type} </span>
                    <span className="ace_paren ace_lparen">(</span>
                    <span className="ace_constant">{info.object.columns[i].max_length}</span>
                    <span className="ace_paren ace_rparen">)</span>
                    </span>;
                } else {
                    var type = <span className="ace_keyword">{info.object.columns[i].type}</span>;
                }
                // default
                if (info.object.columns[i].default_value != null){
                    var default_value = <span>
                        <span className="ace_keyword">DEFAULT </span>
                        <span className="">{info.object.columns[i].default_value}</span>
                    </span>;
                } else {
                    var default_value = "";
                }
                // description
                if (info.object.columns[i].description != null){
                    var descr_suffix = <span className="ace_comment">--</span>;
                    var description = <span className="ace_comment">{info.object.columns[i].description}</span>;
                } else {
                    var descr_suffix = "";
                    var description = "";
                }

                var column = (<tr key={info.object_name+"_"+i}> 
                    <td>{info.object.columns[i].name}</td>
                    <td>{type}</td>
                    <td>{not_null}</td>
                    <td>{default_value}</td>
                    <td>{descr_suffix}</td>
                    <td>{description}</td>
                </tr>);

                columns.push(column);
            }

            // pk
            if (info.object.pk != null){
                var pk_cols = info.object.pk.columns.replace(/^\{/, '');
                var pk_cols = pk_cols.replace(/\}$/, '');
                pk = <p><span className="ace_keyword">CONSTRAINT</span> {info.object.pk.pk_name} 
                <span className="ace_keyword"> PRIMARY KEY</span> ({pk_cols})</p>;
            } else {
                pk = null;
            }

            // check constraints
            if (info.object.check_constraints != null){
                var check_constraints = [];
                for (var i=0; i < info.object.check_constraints.length; i++){
                    var check = <p key={"check_" + info.object.check_constraints[i].name}>
                        <span className="ace_keyword">CONSTRAINT</span> {info.object.check_constraints[i].name} 
                        <span className="ace_keyword"> CHECK </span> {info.object.check_constraints[i].src}
                    </p>;
                    check_constraints.push(check);
                }
            } else {
                var check_constraints = null;
            }

            // indexes
            if (info.object.indexes != null){
                var indexes=[];
                for (var i=0; i < info.object.indexes.length; i++){
                    
                    var idx = info.object.indexes[i];
                    var idx_cols = idx.columns.replace(/^\{/, '');
                    var idx_cols = idx_cols.replace(/\}$/, '');

                    if (idx.unique == 't'){
                        var unique = "UNIQUE ";
                    } else {
                        var unique = "";
                    }
                    if (idx.predicate){
                        var predicate = <span><span className="ace_keyword">WHERE </span>{idx.predicate}</span>
                    } else {
                        var predicate = null;
                    }
                    var index = <p key={"idx_" + idx.name}>
                    <span className="ace_keyword">{unique}INDEX </span>{idx.name}
                    <span className="ace_keyword"> {idx.method} </span>({idx_cols}) {predicate}
                    </p>

                    indexes.push(index);
                }

            } else {
                var indexes = null;
            }


            return (
            <div className="object-info-div"> 
                <p>
                <div>{relkind} <span className="object-info-name">"{info.object.schema}.{info.object.relname}"</span>
                </div>
                <table className="object-info-columns-table table-hover">
                    {columns}
                </table>
                </p>
                {pk}
                {indexes}
                {check_constraints}
                <p> Records: <span className="ace_constant">{info.object.records}</span></p>
                <p> Size: <span className="ace_constant">{info.object.size}</span> </p>
                <p> Total Size: <span className="ace_constant">{info.object.total_size}</span></p>
            </div>
            );
        } else {
            return (
                <div className="alert alert-danger">Not supported object type: {info.object_type}</div>
            );
        }
    }
});

module.exports = ObjectInfo;
