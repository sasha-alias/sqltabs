
import { Driver } from "../Driver";
import { ConnectionPool, Request } from "mssql";
import { Results, Result, ResultType, Message, MessageSeverity } from "../Results";

export default class MSSql extends Driver {

    currentResults: Results;
    pool: ConnectionPool;

    constructor(connstr: string) {
        super(connstr);
        this.pool = new ConnectionPool(this.connstr);
    }

    async _connect(): Promise<boolean>{
        if (!this.connected){
            try {
                await this.pool.connect();
                this.connected = true;
                return true;
            } catch(error){
                this.connected = false;
                return false;
            }
        } else {
            return true;
        }
    }

    async disconnect() {
        this.connected = false;
        await this.pool.close();
    }

    async testConnection(): Promise<boolean> {
        if (await this._connect()){
            try {
                await this.pool.query("SELECT 'test connection'");
                return true;
            } catch(e){
                return false;
            }
        } else {
            return false;
        }
    }

    noticeHandler(msg: any) {
        const severity = MessageSeverity.NOTICE;
        const message = new Message(severity, msg.message, msg.number, '', '', msg.lineNumber, msg.procName);
        const result = new Result(ResultType.MESSAGE, message);
        this.currentResults.pushResult(result);
    }

    async runQuery(query: string): Promise<Results> {

        this.currentResults = new Results();

        if (await this._connect()){
            try {
                const request = new Request(this.pool);
                request.on('info', this.noticeHandler.bind(this));
                request.on('error', this.noticeHandler.bind(this));
                const ret = await request.query(query);
                for (let i in ret.recordsets){
                    const res = new Result(ResultType.DATA, ret.recordsets[i]);
                    this.currentResults.pushResult(res);
                }
            } catch(error) {
                console.log(error);
            }
        }

        return this.currentResults;
    }
}
