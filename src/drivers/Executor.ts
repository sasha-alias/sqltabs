
import Postgres from "./postgres/Database.js";

export default {

    tabConnections: {}, // connections per tab
    bgConnections: {}, // connections per connstr (background connection)

    get tabConnectionCount(): integer {
        return Object.keys(this.tabConnections).length;
    },

    get bgConnectionCount(): integer {
        return Object.keys(this.bgConnections).length;
    },

    async testConnection (tabId, connstr) {
        const db = await this.getDatabase(tabId, connstr);
        const res = await db.testConnection();
        return res;
    },

    async getDatabase(tabId, connstr) {
        // disconnect from previos connection
        if (tabId in this.tabConnections && this.tabConnections[tabId].connstr != connstr){
            await this.disconnect(tabId);
        }
        // return existing connection
        if (tabId in this.tabConnections && this.tabConnections[tabId].connstr == connstr){
            return this.tabConnections[tabId];
        } else {
            // create one background connection per connstr
            if (!(connstr in this.bgConnections)){
                this.bgConnections[connstr] = await this.getConnection(connstr);
            }
            // create one active per tab connection
            this.tabConnections[tabId] = await this.getConnection(connstr);
            return this.tabConnections[tabId];
        }
    },

    async disconnect(tabId) {
        if (tabId in this.tabConnections){
            await this.tabConnections[tabId].disconnect();
            delete this.tabConnections[tabId];
            await this.cleanupBgConnections();
        }
    },

    getConnection(connstr) {
        return new Postgres(connstr);
    },

    async cleanupBgConnections() {
        // for each bgConnection check if it still exists among tabConnections
        // if not then disconnect and delete the one from the bgConnections
        for (let connstr in this.bgConnections) {
            let connCount = 0;
            for (let tabId in this.tabConnections) {
                const tabConn = this.tabConnections[tabId];
                if (tabConn.connstr == connstr){
                    connCount++;
                }
            }
            if (connCount == 0){
                await this.bgConnections[connstr].disconnect();
                delete this.bgConnections[connstr];
            }
        }
    }
}
