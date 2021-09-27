var uuid = require('uuid');
const axios = require('axios');

var deviceReg = {

    createDeviceEntry: function (deviceUUID, name, callback) {
        if (!deviceUUID) callback(undefined);
        const uuidGen = uuid.v4();
        var sql = `INSERT INTO deviceData (uuid, name, config, deviceUUID)
                   VALUES (?, ?, '{}', ?)`;

        global.connection.query(sql, [uuidGen, name, deviceUUID], function (err, result) {
            if (err) throw err;

            callback(uuidGen);
        });


    },


    storeUserDevices: function (userDeviceUUID, userUUID, deviceUUID, callback) {
        if (!userDeviceUUID) callback(undefined);
        var sql_addDevicePermission = `INSERT INTO userDeviceAccess (user, device, deviceType)
                                       VALUES (?, ?, ?)`;

        global.connection.query(sql_addDevicePermission, [userUUID, userDeviceUUID, deviceUUID], function (err, result) {
            if (err) throw err;
            callback();
        });

    },


        //TODO auslagern
    checkUserDeviceAccessPermission: function (useruuid, deviceuuid) {
        return new Promise(function (resolve, reject) {
            var sql = `SELECT *
                       FROM userDeviceAccess
                       WHERE user = ?
                         AND device = ?`;

            global.connection.query(sql, [useruuid, deviceuuid], function (err, result) {
                axios("http://account:3000/api/v1/account/isUserAdmin?uuid="+useruuid).then(parsed => {
                    resolve((result && result[0]) || parsed.data.isAdmin);

                });

            });

        });

    },



    //TODO auslagern
    getDeviceUUID: function (apiKey, callback) {

        const session = global.database.collection("session");
        session.findOne({uuid:apiKey}).then(result=>{
            if(result!==null&&result.usedBy!=null) {
                callback(result.usedBy);
            } else{
                callback(undefined);

            }
        })

    },


    //TODO auslagern
    setOnlineState: function (state, deviceuuid, callback) {

        var sql = `UPDATE deviceData
                   SET online = ?
                   WHERE uuid = ?`;
        global.connection.query(sql, [state, deviceuuid], function (err, result) {

            callback();


        });


    },

    //TODO auslagern
    updateStatusInfo: function (device, key, value, callback) {


        var sql = `SELECT statusInfo
                   FROM deviceData
                   WHERE (uuid = ?)`;
        global.connection.query(sql, [device], function (err, result) {
            var statusInfoJson = JSON.parse(result[0].statusInfo);
            console.log(value);
            statusInfoJson[String(key)] = String(value);
            var setSQL = `UPDATE deviceData
                          SET statusInfo = ?
                          WHERE uuid = ?`;
            global.connection.query(setSQL, [JSON.stringify(statusInfoJson), device], function (err, SETresult) {
                console.log(SETresult);
                callback();


            });


        });

    }

};


module.exports = deviceReg;


