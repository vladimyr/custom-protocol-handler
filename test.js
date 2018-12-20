'use strict';

const ProtocolHandler = require('./');
const sinon = require('sinon');
const test = require('tape');

test('Attempt registering invalid protocol', t => {
  const handler = new ProtocolHandler('url');
  t.plan(1);
  try {
    handler.protocol('invalid-scheme:\\\\', (url, res) => {});
  } catch (err) {
    t.equals(
      err instanceof TypeError && err.message, 'Invalid protocol provided.',
      `throws TypeError: ${err.message}`
    );
  }
});

test('Attempt registering handler for http://', t => {
  const handler = new ProtocolHandler('url');
  t.plan(1);
  try {
    handler.protocol('http://', () => { });
  } catch (err) {
    t.equals(
      err instanceof TypeError && err.message,
      'Registering handler for `http:` is not allowed.',
      `throws TypeError: ${err.message}`
    );
  }
});

test('Attempt registering handler for https://', t => {
  const handler = new ProtocolHandler('url');
  t.plan(1);
  try {
    handler.protocol('https://', () => { });
  } catch (err) {
    t.equals(
      err instanceof TypeError && err.message,
      'Registering handler for `https:` is not allowed.',
      `throws TypeError: ${err.message}`
    );
  }
});

test('Query registered protocols', t => {
  const handler = new ProtocolHandler('url');
  const dummyHandler = (req, res) => {};
  handler
    .protocol('s3://', dummyHandler)
    .protocol('gdrive:', dummyHandler);
  t.plan(1);
  const actual = Array.from(handler.protocols);
  const expected = ['s3:', 'gdrive:'];
  t.deepEquals(actual, expected, 'returns registered protocols');
});

test('Handle registered protocol', t => {
  const handler = new ProtocolHandler('url');
  const stub = sinon.stub();
  const url = 's3://dummyKey';
  const redirectUrl = 'https://example.org';
  const query = { url: encodeURIComponent(url) };
  t.plan(1);
  handler.protocol('s3:', (_, res) => res.redirect(redirectUrl));
  const mw = handler.middleware();
  mw({ query }, { redirect: stub });
  t.equals(
    stub.calledOnce && stub.getCall(0).args[0], redirectUrl,
    'applies correct protocol handler'
  );
});

test('Handle unknown protocol', t => {
  const handler = new ProtocolHandler('url');
  const stub = sinon.stub();
  const url = 's3://dummyKey';
  const query = { url: encodeURIComponent(url) };
  t.plan(1);
  handler.middleware();
  const mw = handler.middleware();
  mw({ query }, { sendStatus: stub });
  t.equals(
    stub.calledOnce && stub.getCall(0).args[0], 400,
    'returns `400 Bad Request` if protocol is not registered'
  );
});
