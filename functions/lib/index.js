"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = exports.helloWorld = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript
exports.helloWorld = (0, https_1.onRequest)({ cors: true }, (request, response) => {
    firebase_functions_1.logger.info("Hello logs!", { structuredData: true });
    response.send("Hello from Firebase!");
});
// HTTPSトリガーの例
exports.api = (0, https_1.onRequest)({ cors: true }, (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.status(204).send('');
        return;
    }
    switch (req.method) {
        case 'GET':
            res.json({ message: 'GET request received', timestamp: new Date().toISOString() });
            break;
        case 'POST':
            res.json({ message: 'POST request received', data: req.body, timestamp: new Date().toISOString() });
            break;
        default:
            res.status(405).json({ error: 'Method not allowed' });
    }
});
