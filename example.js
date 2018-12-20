'use strict';

const app = require('express')();
const handler = require('./')('url');

const port = 3000;
handler.protocol('s3://', (url, res) => res.redirect('https://example.com'));

app.get('/resolve', handler.middleware());
app.listen(port, () => console.log('listening on port: %i!', port));
