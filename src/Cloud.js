var request = require('request');

Cloud = {
    share: function(data, callback, err_callback){
        request({
            method: 'POST',
            uri: 'http://www.sqltabs.com/api/1.0/docs',
            json: true,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(data),
            },
            function(err, res, body){
                if (err){
                    err_callback(err);
                    return;
                }

                if (body.status == 'error'){
                    err_callback(body.message);
                    return;
                }

                callback(body.result);
            });
    },

    getVersion: function(callback){
        request({
            method: 'GET',
            uri: 'http://www.sqltabs.com/version',
            },
            function(err, res, body){
                if (err){
                    return; // ignore errors
                }

                callback(body);
            });
    }
}
module.exports = Cloud;
