
import { Driver } from "./Driver";
import { Results } from "./Results";
import Postgres from "./postgres/Database.js";
import MSSql from "./mssql/Database.js";

class Executor {

    tabConnections: { [id: number] : Driver } = {} // connections per tab
    bgConnections: { [id: string] : Driver } = {} // connections per connstr (background connection)

    get tabConnectionCount(): number {
        return Object.keys(this.tabConnections).length;
    }

    get bgConnectionCount(): number {
        return Object.keys(this.bgConnections).length;
    }

    async testConnection (tabId: number, connstr: string) {
        const db = await this._getDatabase(tabId, connstr);
        const res = await db.testConnection();
        return res;
    }

    async _getDatabase(tabId: number, connstr: string): Promise<Driver> {
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
                this.bgConnections[connstr] = await this._getConnection(connstr);
            }
            // create one active per tab connection
            this.tabConnections[tabId] = await this._getConnection(connstr);
            return this.tabConnections[tabId];
        }
    }

    _getConnection(connstr: string): Driver {

        if (connstr.indexOf('mssql://') == 0){
            return new MSSql(connstr);
        } else {
            return new Postgres(connstr);
        }
    }

    async disconnect(tabId: number) {
        if (tabId in this.tabConnections){
            await this.tabConnections[tabId].disconnect();
            delete this.tabConnections[tabId];
            await this._cleanupBgConnections();
        }
    }

    async _cleanupBgConnections() {
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

    async runQuery(tabId: number, connstr: string, query: string): Promise<Results> {
        const db = await this._getDatabase(tabId, connstr);
        const res = await db.runQuery(query);
        return res;
    }
}

export default new Executor();
