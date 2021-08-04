const uuid = require('uuid');
const hashingSecret = "LEDWAll";
const session = require('./session');


var account = {


    checkAndCreateUser: function (name, email,password) {

        return new Promise((resolve => {

            var sql = `SELECT *
                       FROM account
                       WHERE name = ?;`;
            global.connection.query(sql, [name.toString()], function (err, result) {
                if (result[0]) {

                    resolve('{\"error\":\"Username already exists\",\"errorcode\":\"004\"}');
                } else {

                    checkUserEmailExisting(email, password, name).then((returnValue) => {
                        resolve(returnValue);
                    });

                }


            });


        }));
    },

    login: function (nameOrEmail, password) {

        return new Promise(resolve => {

            const pw_hash = crypto.createHmac('sha256', hashingSecret).update(password).digest('hex');

            var sql = `SELECT *
                   FROM account
                   WHERE (name = ? OR email = ?)
                     AND password = ?`;
            global.connection.query(sql, [nameOrEmail, nameOrEmail, pw_hash], function (err, result) {
                if (result && result[0]) {

                    resolve(`{\"success\":\"loged in\",\"session\":\"${session.startsession(result[0].uuid)}\"}`);

                } else {
                    resolve('{\"error\":\"email or password incorrect\",\"errorcode\":\"003\"}');


                }


            });

        })

    },
    isUserAdmin: function (uuid) {
        return new Promise((resolve, reject) => {
            var sql = `SELECT admin
                   FROM account
                   WHERE uuid = ?`;
            global.connection.query(sql, [uuid], function (err, result) {
                resolve(result[0].admin);
            });
        })



    },

    getAccountByUUID: function (uuid) {
        return new Promise((resolve, reject) => {

            var sql = `SELECT uuid, name, created_at, installedApps
                   FROM account
                   WHERE uuid = ?;`;
            global.connection.query(sql, [uuid.toString()], function (err, result) {

                if (result && result[0]) {
                    resolve(result[0]);

                } else {

                    resolve(undefined);

                }


            });


        })

    },
    getAccountSettings: function (uuid, callback) {
        var sql = `SELECT settings
                   FROM account
                   WHERE uuid = ?;`;
        global.connection.query(sql, [uuid.toString()], function (err, result) {

            if (result && result[0]) {
                callback(result[0].settings);

            } else {

                callback(undefined);

            }


        });


    }


};

module.exports = account;


function checkUserEmailExisting(email,password,name) {

    return new Promise((resolve) => {
        var sql = `SELECT 1
                   FROM account
                   WHERE email = '${email.toString()}';`;

        global.connection.query(sql, function (err, result) {
            if (err) throw err;

            if (result[0]) {
                resolve('{\"error\":\"Email already exists\",\"errorcode\":\"005\"}')
            } else {
                createUser(password,name,email).then((returnValue) => {
                    resolve(returnValue)
                });


            }


        });

    })

}

function createUser(password,name,email) {
    return new Promise((resolve) => {

        const pw_hash = crypto.createHmac('sha256', hashingSecret).update(password.toString()).digest('hex');

        const user = uuid.v4();
        var sql = `INSERT INTO account (uuid, email, password, name)
                   VALUES ('${user}', '${email.toString()}', '${pw_hash}', '${name.toString()}')`;
        global.connection.query(sql, function (err, result) {
            if (err) throw err;
        });
        resolve(`{\"success\":\"Account creating done\",\"session\":\"${session.startsession(user)}\"}`)

    })

}
