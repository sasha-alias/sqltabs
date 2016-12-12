var assert = require('assert');
var PqClient = require('./PqClient');
describe('connector/postgres', function() {
    describe('PqClient', function() {

        it("is able to connect", function(done){
            var client = new PqClient();
            client.sendQuery("SELECT 1", function(){done()}, done);
        });


        it("is able to execute 2 queries", function(done){
            var client = new PqClient();
            client.sendQuery("SELECT n, n as m from generate_series(1,3) n; SELECT n+100 n, n as m from generate_series(1,3) n;", function(res){
                assert.equal(res.datasets.length, 2)
                done();
            }, done);
        });

        it("the result is properly formatted", function(done){
            var client = new PqClient();
            client.sendQuery("SELECT 1", function(res){
                assert.equal(res.datasets[0].nrecords, 1);
                assert.equal(typeof(res.datasets[0].data[0][0]), 'string');
                done();
            }, done);
        });
    });
});
