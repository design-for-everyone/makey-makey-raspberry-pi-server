
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const https = require('https')
const fs = require('fs')
const port = process.env.PORT || 443;
const helper = require('./utils/helpers');

require('dotenv').config();

const app = express();
app.use(express.static('public'));
app.use(morgan('tiny'));
app.use(cors());
app.use(bodyParser.json());

const httpsOptions = {
    key: fs.readFileSync('./security/cert.key'),
    cert: fs.readFileSync('./security/cert.pem')
}

// starting the server
const server = https.createServer(httpsOptions, app)
    .listen(port, () => {
        console.log(`the server is running at ${port}`);
    })


// setting up socket.io
const socketio = require('socket.io')(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

socketio.on('connection', socket => {
    console.log(`A new client is connected with id: ${socket.id}`);
});

// routes for testing
app.get('/status', (req, res) => {
    res.json({
        message: 'Server is up and running',
        ip: helper.getIpAddress().wlan0[0]
    });
});

app.get('/testsocket', (req, res) => {
    socketio.emit('message', JSON.stringify({ message: 'message was send' }));
    res.json({
        message: 'Message was send'
    });
});

// declare key buffer codes
const inputs = {
    release: [0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x27, 0x74, 0x88, 0x7c, 0x84],
    space: [0x02, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x27, 0x74, 0x88, 0x7c, 0x84],
    up: [0x02, 0x00, 0x00, 0x52, 0x00, 0x00, 0x00, 0x00, 0x27, 0x74, 0x88, 0x7c, 0x84],
    down: [0x02, 0x00, 0x00, 0x51, 0x00, 0x00, 0x00, 0x00, 0x27, 0x74, 0x88, 0x7c, 0x84],
    left: [0x02, 0x00, 0x00, 0x50, 0x00, 0x00, 0x00, 0x00, 0x27, 0x74, 0x88, 0x7c, 0x84],
    right: [0x02, 0x00, 0x00, 0x4f, 0x00, 0x00, 0x00, 0x00, 0x27, 0x74, 0x88, 0x7c, 0x84],
}

// checking if 2 buffers are equal
const bufferEqual = (a, b) => {
    for (let i = 0; i < 5; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

const HID = require('node-hid');
const devices = HID.devices();
const deviceInfo = devices.find(d => d.vendorId === 26154 && d.productId === 12289);
if (deviceInfo) {
    const makey = new HID.HID(deviceInfo.path);
    console.log('waiting for input...');
    let currentInput = '';
    makey.on("data", function (data) {
        //console.log(data);
        for (var input in inputs) {
            if (inputs.hasOwnProperty(input)) {
                if (bufferEqual(data, Buffer.from(inputs[input]))) {
                    if(currentInput !== input){
                        currentInput = input;
                        socketio.emit('message', JSON.stringify(input));
                        console.log(`sending ${input} to the clients`);
                    }
                }

            }
        }
    });
}else{
    console.log('makey makey was not connected');
}