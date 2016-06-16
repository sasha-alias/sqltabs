var React = require('react');
var CassandraMAP = require("cassandra-map");

var Renderer = {
    renderCluster: function(eventKey, info, getFunction){

        var peers = [];
        info.object.peers.forEach(function(item){
            var id = "peer_"+eventKey+"_"+item.address;
            peers.push(
            <tr key={id}>
                <td>{item.address}</td>
                <td>{item.datacenter}</td>
                <td>{item.rac}</td>
                <td>{item.cassandraVersion}</td>
            </tr>
            );
        });

        var keyspaces = [];
        var getKeyspaceHandler = function(keyspace){
            return function(){
                getFunction(keyspace+'.');
            }
        }

        for (k in info.object.keyspaces){
            keyspaces.push(
                <div> <a href="#" onClick={getKeyspaceHandler(k)}>{k}</a> </div>
            );
        }


        return (<div className="object-info-div">Cluster <span className="object-info-name">{info.object_name}</span> <br/>
            Cassandra v{info.object.version}

            <ul className="schema-nav nav nav-pills">
              <li role="presentation"><a href="#" onClick={function(){
                  scrollTo('#output-console-'+eventKey, '#peers-'+eventKey);
              }}> Hosts ({info.object.peers.length}) </a></li>

              <li role="presentation"><a href="#" onClick={function(){
                  scrollTo('#output-console-'+eventKey, '#keyspaces-'+eventKey);
              }}> Keyspaces ({Object.keys(info.object.keyspaces).length}) </a></li>
            </ul>

            <h3 id={'peers-'+eventKey}> Hosts </h3>
            <table  className="table">
            <tr>
                <th>Host</th>
                <th>Datacenter</th>
                <th>Rack</th>
                <th>cassandra Version</th>
            </tr>
            {peers}
            </table>

            <h3 id={'keyspaces-'+eventKey}> Keyspaces </h3>
            {keyspaces}

            <hr/>

        </div>);
    },

    renderKeyspace: function(eventKey, info, getFunction){

        var tables = [];
        var getTableHandler = function(table){
            return function(){
                getFunction(info.object_name+"."+table);
            };
        }
        info.object.tables.forEach(function(item){
            tables.push(
                <li><a href="#" onClick={getTableHandler(item)}>{item}</a></li>
            );
        });

        var cluster_link = (<a href="#" onClick={function(){getFunction('');}}> Cluster {info.object.cluster_name} </a>);

        return (
        <div className="object-info-div">
        <p> {cluster_link} / Keyspace <span className="object-info-name">{info.object_name}</span> </p>
            <pre>REPLICATION = {CassandraMAP.stringify(info.object.replication)}</pre>
            <h3> Tables </h3>
            <ul>
            {tables}
            </ul>
        </div>);
    },

    renderTable: function(eventKey, info, getFunction){

        var cluster_link = (<a href="#" onClick={function(){getFunction('');}}> Cluster {info.object.cluster_name} </a>);
        var keyspace_link = (<a href="#" onClick={function(){getFunction(info.object.keyspace+'.');}}> Keyspace {info.object.keyspace} </a>);

        var columns = [];
        info.object.columns.forEach(function(item){
            columns.push(
                <tr><td>{item.name}</td> <td> {item.typename} </td></tr>
            );
        });

        return (
        <div className="object-info-div">
        <p> {cluster_link} / {keyspace_link} / Table <span className="object-info-name">{info.object_name}</span> </p>
        <h3> Columns </h3>
            <table className="table">
            {columns}
            </table>
        </div>);
    },
}

module.exports = Renderer;
