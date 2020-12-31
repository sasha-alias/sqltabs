
import { Client } from "pg";

export default class Postgres {

    connected: boolean = false;

    constructor(connstr: string){
        this.connstr = connstr;
    }

    async testConnection(): boolean {
        try {
            if (!this.connected){
                this.client = new Client(this.connstr);
                await this.client.connect();
                this.connected = true;
            }
            await this.client.query("SELECT true");
            return true;
        } catch (err){
            this.connected = false;
            return false;
        }
    }

    async disconnect(){
        if (this.connected){
            await this.client.end();
            this.connected = false;
        }
    }
}
