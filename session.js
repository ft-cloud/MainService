var uuid = require('uuid');
const generateAPIKey = function generateAPIToken(user, usedBy, callback) {

    const session = uuid.v4();

    var sql = `INSERT INTO session (uuid,user,timeout,token,usedBy) VALUES ('${session}', '${user}', DATE_ADD(now(),interval 10 minute),1,'${usedBy}')`;
    global.connection.query(sql, function (err, result) {
        if (err) throw err;
        callback(session);
    });

};
var session = {
    startsession: function (user) {

        const session = uuid.v4();

        var sql = `INSERT INTO session (uuid,user,timeout) VALUES ('${session}', '${user}', DATE_ADD(now(),interval 10 minute))`;
        global.connection.query(sql, function (err, result) {
            if (err) throw err;
        });

        return session;

    },

    reactivateSession: function (session) {

        var sql = `UPDATE session SET timeout = DATE_ADD(now(),interval 10 minute) WHERE uuid = '${session}'`;
        global.connection.query(sql, function (err, result) {
            if (err) throw err;
        });
    },


    getUserUUID: function (session, callback) {


        var sql = `SELECT user FROM session WHERE uuid='${session}';`;
        global.connection.query(sql, function (err, result) {

            if (result && result[0]) {
                callback(result[0].user);

            } else {

                callback(undefined);

            }


        });


    },


    deleteSession: function (session) {

        return new Promise((resolve) => {
            var sql = `delete from session where uuid='${session}'`;

            global.connection.query(sql, function (err, result) {
                if (err) throw err;

                resolve(`{\"success\":\"loged out\"}`);

                //TODO return error when no session is available

            });
        })



    },


    validateSession: function (session, callback) {

        var sql = `SELECT * FROM session WHERE uuid = '${session.toString()}';`;

        global.connection.query(sql, function (err, result) {
            if (result && result[0]) {
                callback(true);

            } else {

                callback(false);

            }


        });


    },
    generateAPIKey: generateAPIKey


};

module.exports = session;


function deleteSessions() {
    var sql = `delete from session where (timeout < DATE_SUB(now(),interval 10 minute) and (token = 0))`;
    global.connection.query(sql, function (err, result) {
        if (err) throw err;
    });
}

setInterval(deleteSessions, 1000 * 60 * 2);