const {app} = require("./index.js");
const session = require("./session");
const device = require("./device");
const registrationCodes = [];
module.exports.init = function() {

    app.get('/api/v1/regDevice/getRegistrationCode', (req, res) => {

        var regCode;
        var counter = 0;
        while (counter < 200) {
            const random = Math.floor(Math.random() * 16383); //Because this is in bin 14 length
            if (!registrationCodes.includes(random)) {
                regCode = random;
                console.log("Reg Code is: " + regCode);
                registrationCodes.push(regCode);
                break;
            }
            counter++;

        }
        if (counter > 199) {
            res.send("something went wrong (No Registration Keys available)");


        }
        const tempOBJ = {
            token: regCode

        };

        res.send(JSON.stringify(tempOBJ));

    });


    const waitForRegistrationDevices = [];

    app.get('/api/v1/regDevice/waitForRegistration', (req, res) => {


        if (req.query.regCode && req.query.deviceUUID && req.query.deviceName) {

            if (registrationCodes.includes(Number.parseInt(req.query.regCode))) {
                var objTest = {
                    uuid: req.query.deviceUUID.toString(),
                    res: res,
                    name: req.query.deviceName
                };


                waitForRegistrationDevices[req.query.regCode.toString()] = objTest;

            } else {
                res.send('{\"error\":\"No valid registration code!\",\"errorcode\":\"010\"}');


            }

        } else {

            res.send('{\"error\":\"No valid inputs!\",\"errorcode\":\"002\"}');
        }

    });


    app.get('/api/v1/regDevice/registerByCode', (req, res) => {

        if (req.query.regCode && req.query.session) {


            session.validateSession(req.query.session.toString(), (isValid) => {
                if (isValid) {
                    session.reactivateSession(req.query.session);
                    session.getUserUUID(req.query.session.toString(), (uuid) => {
                        if (uuid) {

                            if (registrationCodes.includes(Number.parseInt(req.query.regCode))) {
                                if(waitForRegistrationDevices[req.query.regCode.toString()] === undefined) {

                                    const indexOfCode = registrationCodes.indexOf(Number.parseInt(req.query.regCode));
                                    if (indexOfCode > -1) registrationCodes.splice(indexOfCode, 1);

                                    const indexOfRequest = waitForRegistrationDevices.indexOf(waitForRegistrationDevices[req.query.regCode.toString()]);
                                    if (indexOfRequest > -1) registrationCodes.splice(indexOfRequest, 1);
                                    res.send('{\"error\":\"No Device is waiting for this registration!\",\"errorcode\":\"010\"}');

                                    return;

                                }

                                //Create Devices in Database
                                device.createDeviceEntry(waitForRegistrationDevices[req.query.regCode.toString()].uuid.toString(), waitForRegistrationDevices[req.query.regCode.toString()].name.toString(), (AddUuid) => {

                                    session.generateAPIKey(uuid, AddUuid, (apiKey) => {

                                        waitForRegistrationDevices[req.query.regCode.toString()].res.send(`{"success":"true","APIKey":"${apiKey}","deviceuuid":"${AddUuid}"}`);

                                        //Store User Device
                                        device.storeUserDevices(AddUuid, uuid, waitForRegistrationDevices[req.query.regCode.toString()].uuid.toString(), () => {

                                            //Answer Request
                                            res.send(`{"success":"Registration done","deviceType":"${waitForRegistrationDevices[req.query.regCode.toString()].uuid.toString()}","uuid":"${AddUuid}"}`);


                                            //Remove Temp vars
                                            const indexOfCode = registrationCodes.indexOf(Number.parseInt(req.query.regCode));
                                            if (indexOfCode > -1) registrationCodes.splice(indexOfCode, 1);

                                            const indexOfRequest = waitForRegistrationDevices.indexOf(waitForRegistrationDevices[req.query.regCode.toString()]);
                                            if (indexOfRequest > -1) registrationCodes.splice(indexOfRequest, 1);


                                        });


                                    });


                                });

                            } else {
                                res.send('{\"error\":\"No valid registration code!\",\"errorcode\":\"010\"}');
                            }

                        } else {
                            res.send('{\"error\":\"No valid session!\",\"errorcode\":\"006\"}');

                        }
                    });
                } else {
                    res.send('{\"error\":\"No valid session!\",\"errorcode\":\"006\"}');
                }
            });

        } else {

            res.send('{\"error\":\"No valid inputs!\",\"errorcode\":\"002\"}');
        }

    });
}
