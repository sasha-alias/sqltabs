
import { Driver } from "../Driver";
import { ConnectionPool, Request, Error } from "mssql";
import { Results, Result, ResultType, Message, MessageSeverity } from "../Results";

export default class MSSql extends Driver {

    currentResults: Results;
    pool: ConnectionPool;

    constructor(connstr: string) {
        super(connstr);
        this.pool = new ConnectionPool(this.connstr);
    }

    static splitScript(script: string): string[] {
        // Splits script to array by GO statement.
        // Only simple GO statement supported without number or comments afterwards
        return script.split(/\n\s*GO\s*[0-9]*\s*\n*/).filter(item => item != '');
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

    errorHandler(error: Error) {
        const severity = MessageSeverity.ERROR;
        const message = new Message(severity, error.message, error.number, '', '', error.lineNumber, error.procName);
        const result = new Result(ResultType.MESSAGE, message);
        this.currentResults.pushResult(result);
    }


    async runQuery(query: string): Promise<Results> {

        this.currentResults = new Results();

        if (await this._connect()){

            for (var q of MSSql.splitScript(query)){
                try {
                    const request = new Request(this.pool);
                    request.on('info', this.noticeHandler.bind(this));
                    request.on('error', this.errorHandler.bind(this)); // execution error
                    const ret = await request.query(q);
                    if (ret.recordsets.length == 0){
                        const res = new Result(ResultType.COMMAND, `OK: ${query}`);
                        this.currentResults.pushResult(res);
                    }
                    for (let i in ret.recordsets){
                        const res = new Result(ResultType.DATA, ret.recordsets[i]);
                        this.currentResults.pushResult(res);
                    }
                } catch(error) { // syntax error
                    this.errorHandler(error);
                }
            }
        }

        return this.currentResults;
    }
}
