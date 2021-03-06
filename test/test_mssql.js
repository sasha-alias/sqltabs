
import Executor from "../build/drivers/Executor";
import assert from "assert";

const CONNSTR = "mssql://SA:StrongPassword1@localhost:1433/msdb";
const BAD_CONNSTR = "mssql://SA@localhost:1433/msdb";

describe("MSSQL driver", async ()=> {

    it("testConnection works", async ()=>{
        const testConnection = await Executor.testConnection(0, CONNSTR);
        await Executor.disconnect(0);
        assert(testConnection);
    });

    it("testConnection with bad connstr returns false", async ()=>{
        const testConnection = await Executor.testConnection(0, BAD_CONNSTR);
        await Executor.disconnect(0);
        assert(!testConnection);
    });

    it("runs a simple query", async ()=>{
        const res = await Executor.runQuery(0, CONNSTR, "SELECT 1 test");
        await Executor.disconnect(0);
        assert.equal(res.items[0].data[0].test, 1);
    });

    it("runs two queries", async ()=>{
        const res = await Executor.runQuery(0, CONNSTR, "SELECT 11 test; SELECT 22 test;");
        await Executor.disconnect(0);
        assert.equal(res.items[0].data[0].test, 11);
        assert.equal(res.items[1].data[0].test, 22);
    });

    it("raise error works", async ()=>{
        const res = await Executor.runQuery(0, CONNSTR, "RAISERROR ('Test notice', 0, 0)");
        await Executor.disconnect(0);
        assert.equal(res.items[0].resultType, 'MESSAGE');
        assert.equal(res.items[0].message.message, 'Test notice');
    });

    it("print message works", async ()=>{
        const res = await Executor.runQuery(0, CONNSTR, "PRINT 'Test message'");
        await Executor.disconnect(0);
        assert.equal(res.items[0].resultType, 'MESSAGE');
        assert.equal(res.items[0].message.message, 'Test message');
    });

    it("query and print work together", async ()=>{
        const res = await Executor.runQuery(0, CONNSTR, "PRINT 'Test message'; SELECT 1 test;");
        await Executor.disconnect(0);
        assert.equal(res.items[0].resultType, 'MESSAGE');
        assert.equal(res.items[0].message.message, 'Test message');
        assert.equal(res.items[1].data[0].test, 1);
    });

});
