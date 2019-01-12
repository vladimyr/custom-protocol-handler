'use strict';

const protocolHandler = require('./')();
protocolHandler.protocol('s3://', url => 'https://example.com');

// Standalone usage
protocolHandler.resolve('s3://test')
  .then(url => console.log('Resolved: s3://test to %s', url));

// Using as Express middleware
const port = 3000;
const app = require('express')();
app.get('/resolve', protocolHandler.middleware());
app.listen(port, () => console.log('listening on port: %i!', port));
