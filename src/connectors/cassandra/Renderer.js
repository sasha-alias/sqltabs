var React = require('react');

var Renderer = {
    renderCluster: function(eventKey, info, getFunction){

        var peers = [];
        info.object.peers.forEach(function(item){
            var id = "peer_"+eventKey+"_"+item.address;
            peers.push(
            <tr key={id}>
                <td><a href="#" onClick={function(){getFunction('host::'+item);}}>{item.address}</a></td>
                <td>{item.datacenter}</td>
                <td>{item.rac}</td>
                <td>{item.cassandraVersion}</td>
            </tr>
            );
        });

        var keyspaces = [];
        for (k in info.object.keyspaces){
            keyspaces.push(
                <div> <a href="#" onClick={function(){getFunction(k+'.');}}>{k}</a> </div>
            );
        }


        return (<div className="object-info-div">Cluster <span className="object-info-name">{info.object_name}</span> <br/>
            Cassandra v{info.object.version}

            <ul className="schema-nav nav nav-pills">
              <li role="presentation"><a href="#" onClick={function(){
                  scrollTo('#output-console-'+self.props.eventKey, '#peers-'+eventKey);
              }}> Hosts ({info.object.peers.length}) </a></li>

              <li role="presentation"><a href="#" onClick={function(){
                  scrollTo('#output-console-'+self.props.eventKey, '#keyspaces-'+eventKey);
              }}> Keyspaces ({Object.keys(info.object.keyspaces).length}) </a></li>
            </ul>

            <h3> Hosts </h3>
            <table>
            <tr>
                <th>Host</th>
                <th>Datacenter</th>
                <th>Rack</th>
                <th>cassandra Version</th>
            </tr>
            {peers}
            </table>

            <h3> Keyspaces </h3>
            {keyspaces}

            <hr/>

        </div>);
    },

    renderKeyspace: function(eventKey, info, getFunction){

        var tables = [];
        info.object.tables.forEach(function(item){ 
            tables.push(
                <li>{item}</li>
            );
        });

        return (<div className="object-info-div">Keyspace <span className="object-info-name">{info.object_name}</span> <br/>
            <ul>
            {tables}
            </ul>
        </div>);
    },

    renderTable: function(eventKey, info, getFunction){

        return (<div className="object-info-div">Table <span className="object-info-name">{info.object_name}</span> <br/>
            <ul>
            </ul>
        </div>);
    },
}

module.exports = Renderer;
