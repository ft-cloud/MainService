var session = require('../session');
var account = require('../account');
var device = require('../device');
const liveConnection = require("../TCPLive/TCPLiveConnection");
const {app} = require("../index");

const droneLiveClients = [];

module.exports.init = function() {

    app.ws('/api/v1/device/droneLiveConnection', function (ws, req) {

        if (req.query.session&&req.query.device) {
            session.validateSession(req.query.session.toString(), (isValid) => {
                if (isValid) {
                    session.reactivateSession(req.query.session);
                    session.getUserUUID(req.query.session.toString(), (uuid) => {
                        if (uuid) {

                            device.checkUserDeviceAccessPermission(uuid,req.query.device.toString()).then(result => {
                                if(result) {
                                    if(droneLiveClients[req.query.device.toString()] ===undefined ){
                                        droneLiveClients[req.query.device.toString()] = [];
                                        droneLiveClients[req.query.device.toString()][0] = ws;
                                    }else{
                                        droneLiveClients[req.query.device.toString()][droneLiveClients[req.query.device.toString()].length] = ws;
                                    }



                                    ws.deviceUUID = req.query.device.toString();
                                    ws.session = req.query.session.toString();

                                    initWS(ws);

                                }else{
                                    ws.close();
                                }
                            })


                        } else {

                            ws.close();
                        }
                    });

                } else {

                    ws.close();
                }
            });
        } else {

            ws.close();

        }


    });




}

module.exports.liveDroneClientConnections = droneLiveClients;

function initWS(ws) {
    ws.on('close', function () {
        if(ws.deviceUUID) {
           const index = droneLiveClients[ws.deviceUUID].indexOf(ws)
            if (index > -1) {
                droneLiveClients[ws.deviceUUID].splice(index, 1);
            }

        }
    });

    ws.on('message', function (msg) {
        if(ws.deviceUUID) {
            const parsedMsg = JSON.parse(msg);
            if (parsedMsg.type === 'pid') {
                const pidType = parsedMsg.pidType;
                const p = parsedMsg.p;
                const i = parsedMsg.i;
                const d = parsedMsg.d;
                if(liveConnection.liveDevices[ws.deviceUUID]) {
                    liveConnection.liveDevices[ws.deviceUUID].write(`ft+pid=${pidType},${p},${i},${d}\n`)
                }
            }
        }

    });
}
