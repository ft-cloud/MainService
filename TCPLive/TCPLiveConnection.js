import Net from "net";

import {session} from "sessionlib/session.js";

import {deviceReg as device} from "../deviceReg.js";

import axios from "axios";

import {droneLiveClients as liveDroneClients} from "../FrontendConnection/droneFrontendConnection.js";

const port = 8856;
export const liveDevices = [];

//TODO deprecated only there to support drone with sim800l

function doQueue(socket) {

    if (socket.queue && socket.queue.length > 0) {
        checkCommand(socket.queue[0].toString(), socket, () => {
            socket.queue.shift();
            doQueue(socket);
        })
    }

}

export function initTCPLiveConnection() {

    const server = new Net.Server();
    server.listen(port, function () {
        console.log(`Server listening for device connection requests on socket localhost:${port}`);
    });

    server.on('connection', function (socket) {
        console.log('A Device has Connected to the server. Waiting for authentication!');
        socket.lastMessage = Date.now();
        socket.queue = [];

        socket.write('ft+ready\n');

        function checkConnection() {
            if ((Date.now() - socket.lastMessage) >= 5000) {
                socket.write("ft+timeout\n");
                clearInterval(socket.interval);
                terminateConnection(socket);
            }
        }

        socket.interval = setInterval(checkConnection, 5000);


        socket.on('data', function (chunk) {
            socket.lastMessage = Date.now();
            console.log(`Data received from client: ${chunk.toString()}`);
            chunk.toString().split("\n").forEach((message) => {
                if(message.length>0) {



                        if (checkIncomingMessage(message, socket)) {
                            message = message.toString().slice(3, message.length);

                            socket.queue.push(message);
                        }
                    }




            })
            doQueue(socket);

        });

        // When the client requests to end the TCP connection with the server, the server
        // ends the connection.
        socket.on('end', function () {
            terminateConnection(socket);
            console.log('Closing connection with the client');
        });

        // Don't forget to catch error, for your own sake.
        socket.on('error', function (err) {
            console.log(`Error: ${err}`);
        });
    });

};

function checkIncomingMessage(message, socket) {
    if (message.toString().startsWith("ft+")) {
        return true;
    } else {
        console.log(`Unknown data received from client`);
        if (socket.json) {
            socket.write(`{"success":false,"error",""}\n`);
        } else {
            socket.write("ft+error\n");
        }
        return false;
    }

}


function sendSocketParamError(socket) {
    if (socket.json) {
        socket.write(`{"success":false,"error","cpe"}\n`);
    } else {
        socket.write("ft+error=cpe\n");
    }
}

function sendSocketAuthError(socket) {
    if (socket.json) {
        socket.write(`{"success":false,"error","auth"}\n`);
    } else {
        socket.write("ft+error=auth\n");
    }
}

function sendSocketOK(socket) {
    if (socket.json) {
        socket.write(`{"success":true,"error",""}\n`);
    } else {
        socket.write("ft+ok\n");
    }
}

export function terminateConnection(socket) {
    if (socket.auth) {
        device.getDeviceUUID(socket.auth, (deviceUUID) => {
            device.setOnlineState(0, deviceUUID, () => {
            });
        });
        if (liveDroneClients[socket.deviceUUID]) {
            liveDroneClients[socket.deviceUUID].forEach(e => {
                e.send(JSON.stringify({
                    type: "clientStatusUpdate",
                    onlineState: "Offline"
                }))
            });
        }

        liveDevices[socket.deviceUUID] = undefined;
    }
    socket.destroy();
}

export function deleteDevice(socket) {
    if (socket.auth) {
        if (socket.json) {
            socket.write(`{"update":"devicedelete"}\n`);
        } else {
            socket.write("ft+devicedelete\n");
        }
        terminateConnection(socket);
    }
}

function spreadPosToDroneClients(device, lat, long, alt, ConStats, height) {
    console.log(liveDroneClients);
    console.log(liveDroneClients[device]);
    console.log(device);
    if (liveDroneClients[device] !== undefined) {
        liveDroneClients[device].forEach(client => {
                try {
                    client.send(JSON.stringify({
                        type: "clientPos",
                        lat: lat,
                        long: long,
                        alt: alt,
                        ConnectedSatellites: ConStats,
                        height: height
                    }));
                }catch (e) {

                }

        });
    }

}

function spreadBatteryVoltageToDroneClients(device, voltage, percentage) {

    if (liveDroneClients[device] !== undefined) {
        liveDroneClients[device].forEach(client => {
            try {
                client.send(JSON.stringify({
                    type: "voltage",
                    voltage: voltage,
                    percentage: percentage
                }));
            }catch (e) {

            }
        });
    }

}
function spreadFlightModeToDroneClients(device, flightMode, emergencyMode) {

    if (liveDroneClients[device] !== undefined) {
        liveDroneClients[device].forEach(client => {
            try {
                client.send(JSON.stringify({
                    type: "flightMode",
                    flightMode: flightMode,
                    emergencyMode: emergencyMode
                }));
            }catch (e) {

            }
        });
    }

}

function checkCommand(actionString, socket, mainCallback) {
    const command = actionString.split(/\W+/g)[0];
    const data = actionString.slice(actionString.indexOf(command) + command.length, actionString.length);
    let containsParams = false;
    let paramList = [];
    if (data.indexOf("=") !== -1) {
        containsParams = true;
        let params = data.slice(1, data.length);
        paramList = params.split(",");
    }
    console.log(containsParams);
    console.log(paramList);
    console.log(command);


    switch (command) {
        case 'key':
            if (!containsParams || paramList.length !== 1) {
                sendSocketParamError(socket);
                mainCallback();
                return;
            }
            console.log(paramList[0]);
            session.validateSession(paramList[0], (callback) => {
                if (callback) {
                    socket.auth = paramList[0];
                    device.getDeviceUUID(socket.auth, (deviceUUID) => {

                        liveDevices[deviceUUID] = socket;
                        socket.deviceUUID = deviceUUID;

                        if (liveDroneClients[socket.deviceUUID]) {
                            liveDroneClients[socket.deviceUUID].forEach(e => {
                                e.send(JSON.stringify({
                                    type: "clientStatusUpdate",
                                    onlineState: "Online"
                                }))
                            });
                        }
                        device.setOnlineState(1, deviceUUID, () => {
                            mainCallback();
                        });

                    });
                    sendSocketOK(socket);
                } else {
                    sendSocketAuthError(socket);
                    mainCallback();
                }
            });
            break;

        case 'auth':
            if (socket.auth) {
                sendSocketOK(socket);
            } else {
                sendSocketAuthError(socket);
            }
            mainCallback();
            break;

        case 'close':
            terminateConnection(socket);
            socket.auth = undefined;
            socket.queue.clear();
            mainCallback();
            break;
        case 'username':
            if (socket.auth) {


                axios("http://account:3000/api/v1/account/info?session="+socket.auth).then(response => {
                    if (socket.json) {
                        socket.write(`{"result":"${response.name}"}\n`);
                    } else {
                        socket.write("ft+username=" + response.name + "\n");
                    }
                    mainCallback();
                });


            } else {
                sendSocketAuthError(socket);
                mainCallback();
            }
            break;
        case 'debug':
            socket.write("ParamsList: " + paramList + " raw param: ft+" + actionString + "\n");
            mainCallback();
            break;
        case 'jsonupgrade':
            socket.json = true;
            socket.write(`{"result":"switching ok"}`);
            mainCallback();
            break;
        case 'pos':
            if (socket.auth) {
                if (!containsParams || paramList.length !== 5) {
                    sendSocketParamError(socket);
                    mainCallback();
                    return;
                }
                const lat = parseFloat(paramList[0]);
                const long = parseFloat(paramList[1]);
                const alt = parseFloat(paramList[2]);
                const ConSats = parseFloat(paramList[3]);
                const height = parseFloat(paramList[4]);
                device.updateStatusInfo(socket.deviceUUID, "lat", lat, () => {
                    device.updateStatusInfo(socket.deviceUUID, "long", long, () => {
                        device.updateStatusInfo(socket.deviceUUID, "alt", alt, () => {
                            device.updateStatusInfo(socket.deviceUUID, "connectedSatellites", ConSats, () => {
                                device.updateStatusInfo(socket.deviceUUID, "height", height, () => {
                                    sendSocketOK(socket);
                                    spreadPosToDroneClients(socket.deviceUUID, lat, long, alt, ConSats, height);
                                    mainCallback();
                                });
                            });

                        });
                    });
                });
            } else {
                sendSocketAuthError(socket);
                mainCallback();
            }
            break;
        case 'battery':
            if (socket.auth) {
                if (!containsParams || paramList.length !== 2) {
                    sendSocketParamError(socket);
                    mainCallback();
                    return;
                }
                const voltage = parseFloat(paramList[0]);
                const percentage = parseFloat(paramList[1]);

                device.updateStatusInfo(socket.deviceUUID, "batteryVoltage", voltage, () => {
                    device.updateStatusInfo(socket.deviceUUID, "batteryPercentage", percentage, () => {

                        sendSocketOK(socket);
                        spreadBatteryVoltageToDroneClients(socket.deviceUUID, voltage, percentage);
                        mainCallback();
                    });
                });


            } else {
                sendSocketAuthError(socket);
                mainCallback();
            }
            break;

        case 'flightMode':
            if (socket.auth) {
                if (!containsParams || paramList.length !== 2) {
                    sendSocketParamError(socket);
                    mainCallback();
                    return;
                }
                const flightMode = (paramList[0]);
                const emergencyMode = (paramList[1]);

                device.updateStatusInfo(socket.deviceUUID, "flightMode", flightMode, () => {
                    device.updateStatusInfo(socket.deviceUUID, "EmergencyMode", emergencyMode, () => {

                        sendSocketOK(socket);
                        spreadFlightModeToDroneClients(socket.deviceUUID, flightMode, emergencyMode);
                        mainCallback();
                    });
                });


            } else {
                sendSocketAuthError(socket);
                mainCallback();
            }
            break;
        default:

            if (socket.json) {
                socket.write(`{"success":false,"error","cmu"}\n`);
            } else {
                socket.write("ft+error=cmu\n");
            }
            mainCallback();
            break;


    }


}

