import {app} from "./index.js";

import {session} from "sessionlib/session.js";

import {deviceReg} from "./deviceReg.js";

export function initDeviceRegistration() {


    app.post('/api/v2/regDevice/initRegistration', (req, res) => {
        if (req.body.deviceUUID != null) {

            deviceReg.checkDeviceTypeExists(req.body.deviceUUID).then(existsType=>{
                if(existsType) {
                    deviceReg.generateRegistrationCode().then(randomRegCode => {
                        deviceReg.createPreDeviceEntry(req.body.deviceUUID, randomRegCode).then(() => {
                            res.status(200).json({regCode: randomRegCode});
                        });
                    });
                }else{
                    res.status(400).json({error: "No valid inputs!", errorcode: "002"});

                }
            })


        } else {
            res.status(400).json({error: "No valid inputs!", errorcode: "002"});
        }
    });


    //TODO Implement with function to register for the device
    //app.get('/api/v2/regDevice/getUserOneTimeDeviceRegistrationCode',(req,res)=>{
       // session.transformSecurelySessionToUserUUID(req,res).then(res=>{

       // })
   // })


    app.ws('/api/v2/regDevice/registrationCallback', function (ws, req) {
        if (req.query.regCode != null) {
            let registrationCode;
            try {
                registrationCode = parseInt(req.query.regCode);
            } catch (e) {
                ws.close();
                return;
            }

            deviceReg.checkDeviceRegistrationExists(registrationCode).then(result => {
                if (result) {

                    ws.send(JSON.stringify({msg: "Device entry found. Waiting for registration"}));

                    global.database.collection("deviceData").watch([], {fullDocument: "updateLookup"}).on("change", (changeEvent) => {

                        if (changeEvent.operationType === 'delete') {
                            ws.send(JSON.stringify({msg: "Registration was canceled", error: true}));
                            ws.close();
                            return;
                        }

                        if (changeEvent.fullDocument.regCode != null && changeEvent.fullDocument.regCode === registrationCode) {
                            if (changeEvent.operationType === 'update') {

                                if (changeEvent.fullDocument.uuid != null) {

                                    deviceReg.getRegUser(registrationCode).then(userUUID => {


                                    session.generateAPIKey(userUUID, changeEvent.fullDocument.uuid, (NewApiKey) => {

                                        deviceReg.freeRegCode(registrationCode).then(() => {
                                            ws.send(JSON.stringify({msg:"registration done",apiKey: NewApiKey}))
                                            ws.close();

                                        });

                                    });

                                    })

                                }

                            }

                        }

                    });


                } else {
                    ws.send(JSON.stringify({msg: "No device is available with this registration code", error: true}));
                    ws.close();

                }
            });

        } else {
            ws.close(11);
        }

    });

    app.post('/api/v2/regDevice/registerByCode', (req, res) => {
        if (req.body.regCode != null && req.body.deviceName != null) {
            if (req.body.deviceName.toString().length < 4 && req.body.deviceName.toString().length > 49) {
                res.send(`{"success":false,"error":"String too long or too short"}`);
                return;
            }

            let registrationCode;
            try {
                registrationCode = parseInt(req.body.regCode);
            } catch (e) {
                res.status(400).json({error: "No valid inputs!", errorcode: "002"});
            }


            session.transformSecurelySessionToUserUUID(res, req).then(uuid => {
                if (uuid != null) {
                    deviceReg.checkDeviceRegistrationExists(registrationCode).then((result) => {
                        if (result) {

                            deviceReg.updateRegisteredDevice(registrationCode, req.body.deviceName.toString(), uuid).then((newUUID) => {

                                deviceReg.storeUserDevices(newUUID, uuid).then(() => {

                                    res.status(200).json({uuid: newUUID});

                                });

                            });
                        } else {
                            res.status(404).json({
                                "error": "No Device is waiting for this registration!",
                                "errorcode": "010"
                            });
                        }
                    });
                }

            });


        } else {
            res.status(400).json({error: "No valid inputs!", errorcode: "002"});

        }
    });




};
