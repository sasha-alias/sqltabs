var CassandraMAP = require("cassandra-map");

var Renderer = {
    renderCluster: function(eventKey, info, getFunction){

        var peers = [];
        info.object.peers.forEach(function(item){
            var id = "peer_"+eventKey+"_"+item.address;
            peers.push(
            <tr key={id}>
                <td>{item.peer}</td>
                <td>{item.data_center}</td>
                <td>{item.rack}</td>
                <td>{item.release_version}</td>
            </tr>
            );
        });

        var keyspaces = [];
        var getKeyspaceHandler = function(keyspace){
            return function(){
                getFunction(keyspace+'.');
            }
        }

        for (var k in info.object.keyspaces){
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

        console.log(info.object);

        var cluster_link = (<a href="#" onClick={function(){getFunction('');}}> Cluster {info.object.cluster_name} </a>);
        var keyspace_link = (<a href="#" onClick={function(){getFunction(info.object.keyspace+'.');}}> Keyspace {info.object.keyspace} </a>);

        var column_in_list = function (colname, list){
            for (var i=0; i< list.length; i++){
                if (colname == list[i].name){
                    return true;
                }
            }
            return false;
        };

        var columns = [];
        var partition_cols = [];
        var clustering_cols = [];
        var ordinary_cols = [];

        info.object.columns.forEach(function(item){
            var column_string = <tr><td>{item.name}</td> <td> {item.typename} </td></tr>;
            if (column_in_list(item.name, info.object.partitionKeys)){
                partition_cols.push(column_string);
            } else if (column_in_list(item.name, info.object.clusteringKeys)){
                clustering_cols.push(column_string);
            } else {
                ordinary_cols.push(column_string);
            }
        });

        columns = partition_cols.concat(clustering_cols).concat(ordinary_cols);

        var partition_key_cols = [];
        var clustering_key_cols = [];
        info.object.partitionKeys.forEach(function(item){
            partition_key_cols.push(item.name);
        });
        info.object.clusteringKeys.forEach(function(item){
            clustering_key_cols.push(item.name);
        });

        var primary_key;
        if (clustering_key_cols.length > 0){
            primary_key = 'PRIMARY KEY (('+partition_key_cols.join(',')+'),'+clustering_key_cols.join(',')+')';
        } else {
            primary_key = 'PRIMARY KEY (('+partition_key_cols.join(',')+'))';
        }

        var compaction_options = '';
        if (Object.keys(info.object.compactionOptions).length > 0 ){
            compaction_options = '';
            for (var opt in info.object.compactionOptions){
                compaction_options += ", "+"'"+opt+"': '"+info.object.compactionOptions[opt]+"'"
            }
        }

        var compaction = "{'class': '"+info.object.compactionClass +"'" + compaction_options + "}";

        var extra_info = <p> bloom_filter_fp_chance = {info.object.bloomFilterFalsePositiveChance} <br/>
            caching = "'" + {info.object.caching} + "'" <br/>
            comment = "'" + {info.object.comment} + "'" <br/>
            compaction = {compaction} <br/>
            compression = {CassandraMAP.stringify(info.object.compression)} <br/>
            dclocal_read_repair_chance = {info.object.localReadRepairChance} <br/>
            default_time_to_live = {info.object.defaultTtl} <br/>
            gc_grace_seconds = {info.object.gcGraceSeconds} <br/>
            max_index_interval = {info.object.maxIndexInterval} <br/>
            memtable_flush_period_in_ms = {info.object.memtableFlushPeriod} <br/>
            min_index_interval = {info.object.minIndexInterval} <br/>
            read_repair_chance = {info.object.readRepairChance} <br/>
            speculative_retry = "'" + {info.object.speculativeRetry} + "'" <br/>
        </p>

        return (
        <div className="object-info-div">
        <p> {cluster_link} / {keyspace_link} / Table <span className="object-info-name">{info.object_name}</span> </p>
        <h4> Columns </h4>
            <table className="table">
            {columns}
            </table>
        <p> {primary_key} </p>
        {extra_info}
        </div>);
    },
}

module.exports = Renderer;
