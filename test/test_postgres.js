
import Executor from "../build/drivers/Executor";
import assert from "assert";

const PG_CONNSTR = "postgres://postgres:mysecretpassword@localhost:5432/postgres";
const BAD_CONNSTR = "postgres://wrong_connection_string";

describe("Postgres driver", async ()=> {

    it("testConnection", async ()=>{
        const testConnection = await Executor.testConnection(0, PG_CONNSTR);
        await Executor.disconnect(0);
        assert(testConnection);
    });

    it("subsequent testConnection", async ()=>{
        const testConnection = await Executor.testConnection(0, PG_CONNSTR);
        await Executor.disconnect(0);
        assert(testConnection);
    });

    it("testConnection after disconnect", async ()=>{
        await Executor.testConnection(0, PG_CONNSTR);
        await Executor.disconnect(0);
        const testConnection2 = await Executor.testConnection(0, PG_CONNSTR);
        await Executor.disconnect(0);
        assert(testConnection2);
    });

    it("testConnection with bad connstr returns false", async ()=>{
        const testConnection = await Executor.testConnection(0, BAD_CONNSTR);
        await Executor.disconnect(0);
        assert(!testConnection);
    });

    it("good connection works after bad connection", async ()=>{
        const goodConnection = await Executor.testConnection(0, PG_CONNSTR);
        await Executor.disconnect(0);
        assert(goodConnection);
    });

    it("disconnect works on not connected tab", async ()=>{
        await Executor.disconnect(10);
    });

    it("connect tab and then disconnect", async ()=>{
        const goodConnection = await Executor.testConnection(10, PG_CONNSTR);
        await Executor.disconnect(10);
        assert (goodConnection);
    });

    it("creates one bg connection per connstr", async ()=>{
        await Executor.testConnection(0, PG_CONNSTR);
        assert(Executor.bgConnectionCount == 1);
        assert(Executor.tabConnectionCount == 1);
        await Executor.disconnect(0);
        assert(Executor.bgConnectionCount == 0);
        assert(Executor.tabConnectionCount == 0);
    });

    it("disconnects from previous connection when connecting on the same tab", async ()=>{
        await Executor.testConnection(0, PG_CONNSTR);
        await Executor.testConnection(0, BAD_CONNSTR);
        assert(Executor.tabConnectionCount == 1);
        assert(Executor.bgConnectionCount == 1);
        assert(Executor.tabConnections[0].connstr == BAD_CONNSTR);
        assert(Executor.tabConnections[0].connected == false);
    });

    it("runs a single query", async ()=>{
        const res = await Executor.runQuery(0, PG_CONNSTR, "SELECT 555 test");
        await Executor.disconnect(0);
        assert(res.items[0].data[0].test == 555);
        assert.equal(res.items[0].resultType, "DATA");
    });

    it("runs two queries", async ()=>{
        const res = await Executor.runQuery(0, PG_CONNSTR, "SELECT 111 test; SELECT 222 test;");
        assert(res.items[0].data[0].test == 111);
        assert(res.items[1].data[0].test == 222);
        await Executor.disconnect(0);
    });


    it("raise notice works", async ()=>{
        const res = await Executor.runQuery(0, PG_CONNSTR, "DO $$BEGIN RAISE NOTICE 'just a notice'; END;$$;");
        await Executor.disconnect(0);
        assert.equal(res.items[0].message.message, 'just a notice');
        assert.equal(res.items[0].resultType, "MESSAGE");
    });

    it("raise two notices works", async ()=>{
        const res = await Executor.runQuery(0, PG_CONNSTR, "DO $$BEGIN RAISE NOTICE 'notice1'; RAISE NOTICE 'notice2'; END;$$;");
        await Executor.disconnect(0);
        assert(res.items[0].message.message == 'notice1');
        assert(res.items[1].message.message == 'notice2');
    });

    it("raise warning works", async ()=>{
        const res = await Executor.runQuery(0, PG_CONNSTR, "DO $$BEGIN RAISE WARNING 'just a warning'; END;$$;");
        await Executor.disconnect(0);
        assert.equal(res.items[0].message.message, 'just a warning');
        assert.equal(res.items[0].message.severity, "WARNING");
    });

    it("raise exception works", async ()=>{
        const res = await Executor.runQuery(0, PG_CONNSTR, "DO $$BEGIN RAISE EXCEPTION 'just an error'; END;$$;");
        await Executor.disconnect(0);
        assert.equal(res.items[0].message.message, 'just an error');
        assert.equal(res.items[0].message.severity, "ERROR");
    });

    it("detects explain plan", async ()=>{
        const res = await Executor.runQuery(0, PG_CONNSTR, "EXPLAIN SELECT * FROM pg_class");
        await Executor.disconnect(0);
        assert.equal(res.items[0].resultType, "PLAN");
    });

    it("unexpected syntax error handled", async ()=>{
        const res = await Executor.runQuery(0, PG_CONNSTR, "SELECT * FOM nonexisting_table");
        await Executor.disconnect(0);
        assert.equal(res.items[0].message.severity, "ERROR");
    });

    it("keeps the same session between queries on the same tab", async ()=>{
        await Executor.runQuery(0, PG_CONNSTR, "SET sqltabs.test_session = 123");
        const res = await Executor.runQuery(0, PG_CONNSTR, "SELECT current_setting('sqltabs.test_session') test_session");
        const res1 = await Executor.runQuery(1, PG_CONNSTR, "SELECT current_setting('sqltabs.test_session') test_session");
        await Executor.disconnect(0);
        await Executor.disconnect(1);
        assert.equal(res.items[0].data[0].test_session, 123);
        assert.equal(res1.items[0].message.severity, "ERROR");
    });
});
