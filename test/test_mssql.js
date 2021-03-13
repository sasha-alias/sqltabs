
import Executor from "../build/drivers/Executor";
import MSSql from "../build/drivers/mssql/Database";
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

    it("can split script by GO statement", async ()=>{
        const script = `SELECT 1;
GO 1
SELECT 2;
GO
SELECT 3;
GO`;
        const blocks = MSSql.splitScript(script);
        assert.equal(blocks.length, 3);
        assert.equal(blocks[0].trim(), 'SELECT 1;');
        assert.equal(blocks[1].trim(), 'SELECT 2;');
        assert.equal(blocks[2].trim(), 'SELECT 3;');

    });

    it("handles syntax error", async ()=>{
        const res = await Executor.runQuery(0, CONNSTR, "ERROR;");
        await Executor.disconnect(0);
        assert.equal(res.items[0].message.severity, 'ERROR');
        assert.equal(res.items[0].message.message, "Could not find stored procedure 'ERROR'.");
    });

    it("keeps the same session between queries on the same tab", async()=>{
        await Executor.runQuery(0, CONNSTR, "EXEC sp_set_session_context 'sqltabs_test', 'test'");
        const res = await Executor.runQuery(0, CONNSTR, "SELECT SESSION_CONTEXT(N'sqltabs_test') sqltabs_test");
        assert.equal(res.items[0].data[0].sqltabs_test, 'test');
        const res1 = await Executor.runQuery(1, CONNSTR, "SELECT SESSION_CONTEXT(N'sqltabs_test') sqltabs_test");
        assert.equal(res1.items[0].data[0].sqltabs_test, null);
        Executor.disconnect(0);
        Executor.disconnect(1);
    });

    it("EXEC statement generates COMMAND result type", async()=>{
        const res = await Executor.runQuery(0, CONNSTR, "EXEC sp_set_session_context 'sqltabs_test', 'test'");
        assert.equal(res.items[0].resultType, 'COMMAND');
        await Executor.disconnect(0);
    });

});
