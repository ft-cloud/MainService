import {v4 as uuidV4} from "uuid";

import axios from "axios";

export const deviceReg = {

    createDeviceEntry: function (deviceUUID, name, callback) {
        if (!deviceUUID) callback(undefined);
        const deviceData = global.database.collection("deviceData");
        const uuidGen = uuidV4();
        deviceData.insertOne(
            {
                uuid: uuidGen,
                name: name,
                config: {},
                deviceUUID: deviceUUID
            }
        ).then(() => {
            callback(uuidGen);
        });

    },

    freeRegCode(regCode) {

        return new Promise(resolve => {
            const deviceData = global.database.collection("deviceData");
            deviceData.updateOne({regCode: regCode}, {$unset: {regCode: "", regUser: ""}}).then(() => {
                resolve();
            });

        });

    },

    updateRegisteredDevice(regCode, name, userUUID) {
        return new Promise(resolve => {
            const uuidGen = uuidV4();


            global.database.collection("deviceData").updateOne({regCode: regCode}, {
                $set: {
                    uuid: uuidGen,
                    name: name,
                    status: [],
                    settings: [],
                    regUser: userUUID
                }, $unset: {registrationTimeout: ""}
            }).then(() => {
                resolve(uuidGen);
            });
        });
    },

    createPreDeviceEntry: function (deviceUUID, regCode) {
        return new Promise((resolve => {

            const deviceData = global.database.collection("deviceData");
            deviceData.insertOne(
                {
                    deviceUUID: deviceUUID,
                    registrationTimeout: new Date(),
                    regCode: regCode,
                    liveDeviceWaiting: false
                }
            ).then(() => {
                resolve();
            });


        }));
    },

    setDeviceLiveDeviceListening: function(regCode, isWaiting) {
        return new Promise((resolve => {

            const deviceData = global.database.collection("deviceData");
            deviceData.updateOne({regCode:regCode},{$set:{liveDeviceWaiting:isWaiting}})
                .then(() => {
                resolve();
            });


        }));
    },

    checkDeviceRegistrationExists(regCode) {

        return new Promise(resolve => {


            const deviceData = global.database.collection("deviceData");
            deviceData.findOne({regCode: regCode}).then(preDeviceEntry => {

                resolve({success:preDeviceEntry != null,deviceType:preDeviceEntry!=null?preDeviceEntry.deviceUUID:null});

            });

        });


    },

    checkIfLiveDeviceIsWaiting(regCode) {

        return new Promise(resolve => {


            const deviceData = global.database.collection("deviceData");
            deviceData.findOne({regCode: regCode}).then(preDeviceEntry => {

                if(preDeviceEntry) {
                    resolve(preDeviceEntry.liveDeviceWaiting);
                } else {
                    resolve(false);
                }

            });

        });

    },

    checkDeviceTypeExists(deviceType) {
        return new Promise(resolve => {
            const device = global.database.collection("device");
            device.findOne({UUID: deviceType}).then(result => {
                resolve(result != null);
            });

        });
    },


    storeUserDevices: function (userDeviceUUID, userUUID) {
        return new Promise(resolve => {

            const account = global.database.collection("account");
            account.updateOne({uuid: userUUID}, {$push: {devices: userDeviceUUID}}).then(() => {
                resolve();
            });


        });


    },


    //TODO auslagern
    checkUserDeviceAccessPermission: function (useruuid, deviceuuid) {
        return new Promise(function (resolve, reject) {
            const account = global.database.collection("account");
            account.findOne({uuid: useruuid}).then(res => {

                if (res != null && res.devices != null && res.devices.indexOf(deviceuuid) !== -1) {
                    resolve(true);
                } else {
                    axios("http://account:3000/api/v1/account/isUserAdmin?uuid=" + useruuid).then(parsed => {
                        resolve(parsed.data.isAdmin);
                    });
                }

            });
        });

    },


    //TODO auslagern
    getDeviceUUID: function (apiKey, callback) {

        const session = global.database.collection("session");
        session.findOne({uuid: apiKey}).then(result => {
            if (result !== null && result.usedBy != null) {
                callback(result.usedBy);
            } else {
                callback(undefined);

            }
        });

    },


    //TODO auslagern
    setOnlineState: function (state, deviceuuid, callback) {

        const deviceData = global.database.collection("deviceData");
        deviceData.updateOne({uuid: deviceuuid}, {$set: {online: state}}).then(() => {
            callback();
        });

    },

    //TODO auslagern
    updateStatusInfo: function (device, key, value, callback) {


        const deviceData = global.database.collection("deviceData");
        deviceData.findOne({uuid: device}).then(deviceResult => {
            if (deviceResult != null && deviceResult.statusInfo != null) {
                const deviceStatusInfo = deviceResult.statusInfo;
                deviceStatusInfo[key] = value;
                deviceData.updateOne({uuid: device}, {$set: {statusInfo: deviceStatusInfo}}).then(() => {
                    callback();
                });
            }
        });

    },

    generateRegistrationCode() {

        return new Promise((async resolve => {
            const deviceData = global.database.collection("deviceData");

            while (true) {

                const random = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
                const result = await deviceData.findOne({regCode: random});

                if (result == null) {
                    resolve(random);
                    break;
                }

            }


        }));

    },

    getRegUser(regCode) {
        return new Promise(resolve => {

            const deviceData = global.database.collection("deviceData");

            deviceData.findOne({regCode: regCode}).then(result => {
                if (result != null && result.regUser) {
                    resolve(result.regUser);
                } else {
                    resolve(undefined);
                }
            });

        });

    }


};




