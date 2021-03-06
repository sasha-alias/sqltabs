
import { Results } from "./Results"

export abstract class Driver {

    connstr: string;

    connected: boolean = false;

    constructor(connstr: string){
        this.connstr = connstr;
    }

    abstract testConnection(): Promise<boolean>

    abstract disconnect(): void

    abstract runQuery(query: string): Promise<Results>

}
