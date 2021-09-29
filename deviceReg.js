var uuid = require('uuid');
const axios = require('axios');

var deviceReg = {

    createDeviceEntry: function (deviceUUID, name, callback) {
        if (!deviceUUID) callback(undefined);
        const deviceData = global.database.collection("deviceData");
        const uuidGen = uuid.v4();
        deviceData.insertOne(
            {
                uuid:uuidGen,
                name: name,
                config: {},
                deviceUUID: deviceUUID
            }
        ).then(()=>{
            callback(uuidGen);
        })

    },


    storeUserDevices: function (userDeviceUUID, userUUID, deviceUUID, callback) {
        if (!userDeviceUUID) callback(undefined);
        const account = global.database.collection("account");
        account.updateOne({uuid: userUUID},{$push: {devices: userDeviceUUID}}).then(()=>{
            callback();
        });

    },


        //TODO auslagern
    checkUserDeviceAccessPermission: function (useruuid, deviceuuid) {
        return new Promise(function (resolve, reject) {
            const account = global.database.collection("account");
            account.findOne({uuid:useruuid}).then(res=>{

                if(res!=null&&res.devices!=null&&res.devices.indexOf(deviceuuid)!==-1){
                    resolve(true);
                }else{
                    axios("http://account:3000/api/v1/account/isUserAdmin?uuid="+useruuid).then(parsed => {
                        resolve(parsed.data.isAdmin);
                    });
                }

            })
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

        const deviceData = global.database.collection("deviceData");
        deviceData.updateOne({uuid:deviceuuid},{$set:{online:state}}).then(()=>{
            callback();
        })

    },

    //TODO auslagern
    updateStatusInfo: function (device, key, value, callback) {


        const deviceData = global.database.collection("deviceData");
        deviceData.findOne({uuid:device}).then(deviceResult=>{
            if(deviceResult!=null&&deviceResult.statusInfo!=null) {
                const deviceStatusInfo = deviceResult.statusInfo;
                deviceStatusInfo[key] = value;
                deviceData.updateOne({uuid:device},{$set:{statusInfo:deviceStatusInfo}}).then(()=>{
                    callback();
                })
            }
        })

    }

};


module.exports = deviceReg;


