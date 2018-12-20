'use strict';

const ProtocolHandler = require('./');
const app = require('express')();

const port = 3000;
const handler = new ProtocolHandler();
handler.protocol('s3://', (url, res) => res.redirect('https://example.com'));

app.get('/resolve', handler.middleware());
app.listen(port, () => console.log('listening on port: %i!', port));
