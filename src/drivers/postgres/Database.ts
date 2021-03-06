
import { Driver } from "../Driver";
import { Client } from "pg";
import { Results, Result, ResultType, Message, MessageSeverity } from "../Results";

export default class Postgres extends Driver {

    client: Client

    currentResults: Results

    constructor(connstr: string){
        super(connstr);
        this.client = new Client(connstr);
        this.client.on('notice', this.noticeHandler.bind(this));
    }

    async _connect(): Promise<boolean> {
        try {
            if (!this.connected){
                await this.client.connect();
                this.connected = true;
            }
            return true;
        } catch (err){
            this.connected = false;
            return false;
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            if (await this._connect()){
                await this.client.query("SELECT 'test connection'");
                return true;
            } else {
                this.connected = false;
                return false;
            }
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

    noticeHandler(msg: any) {
        let severity: MessageSeverity = MessageSeverity.NOTICE;
        switch (msg.severity) {
            case 'NOTICE':
                severity = MessageSeverity.NOTICE;
                break;
            case 'WARNING':
                severity = MessageSeverity.WARNING;
                break;
            case 'ERROR':
                severity = MessageSeverity.ERROR;
                break;
        }
        const message = new Message(severity, msg.message, msg.code, msg.detail, msg.hint, msg.position, msg.where);
        const result = new Result(ResultType.MESSAGE, message);
        this.currentResults.pushResult(result);
    }

    async runQuery(query: string): Promise<Results> {
        this.currentResults = new Results();
        if (await this._connect()){
            try {
                const res = await this.client.query(query);
                let results = [];
                if (Array.isArray(res)){
                    results = res;
                } else {
                    results = [res]; // make an array out of a single result
                }

                for (let i in results){
                    let payload = null;
                    let resultType = ResultType.DATA;
                    switch (results[i].command) {
                        case 'EXPLAIN':
                            resultType = ResultType.PLAN;
                            payload = results[i].rows;
                            break;
                        case 'DO':
                            resultType = ResultType.COMMAND;
                            payload = results[i].cmdStatus;
                            break;
                        case 'SELECT':
                            resultType = ResultType.DATA;
                            payload = results[i].rows;
                            break;
                    }
                    const res = new Result(resultType, payload);
                    this.currentResults.pushResult(res);
                }
            } catch (error) {
                this.noticeHandler(error);
            }
        }
        return this.currentResults;
    }
}
