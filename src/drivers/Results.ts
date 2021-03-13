

export enum ResultType {
    DATA = "DATA",
    MESSAGE = "MESSAGE",
    PLAN = "PLAN",
    COMMAND = "COMMAND"
}

export enum MessageSeverity{
    NOTICE = "NOTICE",
    WARNING = "WARNING",
    ERROR = "ERROR"
}

export class Message {
    severity: MessageSeverity;
    message: string
    code: string | undefined
    detail: string | undefined
    hint: string | undefined
    position: number | undefined
    where: string | undefined

    constructor(severity: MessageSeverity,
                message: string,
                code?: string,
                detail?: string,
                hint?: string,
                position?: number,
                where?: string
               ){
        this.severity = severity;
        this.message = message
        this.code = code;
        this.detail = detail;
        this.hint = hint;
        this.position = position;
        this.where = where;
    }
}

export class Results {

    items: Result[] = [];

    constructor(){
    }

    pushResult(result: Result){
        this.items.push(result);
    }
}

export class Result {

    resultType: ResultType;

    data: [][];

    message: Message;

    constructor(resultType: ResultType, payload: any){
        this.resultType = resultType;
        switch (resultType) {
            case ResultType.DATA:
                this.data = payload;
                break;
            case ResultType.MESSAGE:
                this.message = payload;
                break;
            case ResultType.PLAN:
                this.data = payload;
                break
            case ResultType.COMMAND:
                this.message = payload;
                break;
        }
    }
}

