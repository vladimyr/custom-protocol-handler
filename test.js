'use strict';

const { ProtocolHandler } = require('./');
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

test('Resolve registered protocol', async t => {
  const handler = new ProtocolHandler('url');
  const url = 's3://dummyKey';
  const expected = 'https://example.org';
  handler.protocol('s3:', url => expected);
  const actual = await handler.resolve(url);
  t.plan(1);
  t.equals(actual, expected, 'resolves url with registered protocol');
});

test('Handle registered protocol', t => {
  const handler = new ProtocolHandler('url');
  const stub = sinon.stub();
  const url = 's3://dummyKey';
  const redirectUrl = 'https://example.org';
  const query = { url: encodeURIComponent(url) };
  t.plan(1);
  handler.protocol('s3:', url => redirectUrl);
  const mw = handler.middleware();
  mw({ query }, { redirect: stub });
  setTimeout(() => t.equals(
    stub.calledOnce && stub.getCall(0).args[0], redirectUrl,
    'applies correct protocol handler'
  ), 0);
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
  setTimeout(() => t.equals(
    stub.calledOnce && stub.getCall(0).args[0], 400,
    'returns `400 Bad Request` if protocol is not registered'
  ), 0);
});
