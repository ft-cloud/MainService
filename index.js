const express = require('express');
const cors = require('cors');
const app = express();

const { MongoClient } = require("mongodb");
const uri = `mongodb://root:${process.env.MYSQL_ROOT_PASSWORD}@mongo:27017/?authSource=admin&readPreference=primary&directConnection=true&ssl=false`
const client = new MongoClient(uri);

client.connect().then(()=> {
    global.database = client.db("cloud");

})

module.exports.app = app;

const droneLiveConnection = require('./TCPLive/TCPLiveConnection.js');
const droneFrontendConnection = require('./FrontendConnection/droneFrontendConnection.js');
const deviceRegistrationHandler = require('./deviceRegistrationHandler')





app.use(express.json());
app.use(express.urlencoded({extended: true}));






 require('express-ws')(app);
app.use(cors());

const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
    windowMs: 10 * 1000, // 15 minutes
    max: 8 // limit each IP to 50 requests per windowMs
});
//app.use(limiter);  todo activate



app.get("/api/v1/regDevice",(req, res) => {
    res.send(JSON.stringify({microService:"Idk"}))
})



app.listen(3000, () => {
    console.log(`Rest Service app listening at http://localhost:3000`);
});
droneLiveConnection.init();
deviceRegistrationHandler.init();
droneFrontendConnection.init();

/*
//TODO @deprecated
function packWSContent(message, content) {

    return `{"message": "${message}","content": ${content}}`;

}


app.ws('/device/liveconnection', function (ws, req) {

    console.log("test")
    if (req.query.session) {
        session.validateSession(req.query.session.toString(), (isValid) => {
            if (isValid) {
                session.reactivateSession(req.query.session);
                session.getUserUUID(req.query.session.toString(), (uuid) => {
                    if (uuid) {


                        device.getDeviceUUID(req.query.session, (deviceuuid) => {

                            liveDeviceConnection.set(deviceuuid, ws);

                            device.setOnlineState(1, deviceuuid, () => {


                                ws.send(packWSContent("deviceuuid", `{"deviceuuid":"${deviceuuid}"}`));

                                device.getDeviceTypFromDevice(deviceuuid, (deviceTyp) => {
                                    apps.listInstalledCompatibleApps(uuid, deviceTyp.UUID, (apps) => {

                                        if (apps) {
                                            let appuuid = [];
                                            JSON.parse(apps).forEach(e => {
                                                appuuid.push(e.UUID);
                                            });
                                            const tempObj = {
                                                apps: appuuid
                                            };
                                            ws.send(packWSContent("syncApps", JSON.stringify(tempObj)));
                                        }

                                    });

                                });


                                ws.on('close', function () {

                                    device.getDeviceUUID(req.query.session, (deviceuuid) => {
                                        liveDeviceConnection.delete(deviceuuid);

                                        device.setOnlineState(0, deviceuuid, () => {
                                        });
                                    });

                                });

                                ws.on('message', function (msg) {
                                    if (Array.from(liveDeviceConnection.values()).includes(ws)) {
                                        ws.close();
                                        return;
                                    }
                                    ws.send(msg);


                                });


                            });
                        });


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



*/

app.use(function (err,req,res,next){
    if (res.headersSent) {
        return next(err);
    }
    res.status(500);
    res.send('Something went wrong')
})


app.use(function (req, res) {
    res.status(404).send('Something went wrong! Microservice: RegDevice');
});


