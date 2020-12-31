
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

});
