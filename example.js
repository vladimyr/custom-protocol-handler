const app = require('express')();
const protocolHandler = require('./')();

const port = 3000;
protocolHandler.protocol('s3://', url => 'https://example.com');

protocolHandler.resolve('s3://test')
  .then(url => console.log('Resolved: s3://test to %s', url));

app.get('/resolve', protocolHandler.middleware());
app.listen(port, () => console.log('listening on port: %i!', port));
