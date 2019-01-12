'use strict';

const { ProtocolHandler, ProtocolError } = require('./');
const sinon = require('sinon');
const test = require('tape');

test('Attempt registering invalid protocol', t => {
  const handler = new ProtocolHandler();
  t.plan(2);
  try {
    handler.protocol('invalid-$cheme:', (url, res) => {});
  } catch (err) {
    t.equals(err.name, ProtocolError.name, `throws ProtocolError: ${err.message}`);
    t.equals(
      err.code, ProtocolError.ERR_PROTOCOL_INVALID,
      `with correct error code: ERR_PROTOCOL_INVALID`
    );
  }
});

test('Attempt registering handler for http://', t => {
  const handler = new ProtocolHandler();
  t.plan(2);
  try {
    handler.protocol('http://', () => { });
  } catch (err) {
    t.equals(err.name, ProtocolError.name, `throws ProtocolError: ${err.message}`);
    t.equals(
      err.code, ProtocolError.ERR_PROTOCOL_BLACKLISTED,
      `with correct error code: ERR_PROTOCOL_BLACKLISTED`
    );
  }
});

test('Attempt registering handler for https://', t => {
  const handler = new ProtocolHandler();
  t.plan(2);
  try {
    handler.protocol('https://', () => { });
  } catch (err) {
    t.equals(err.name, ProtocolError.name, `throws ProtocolError: ${err.message}`);
    t.equals(
      err.code, ProtocolError.ERR_PROTOCOL_BLACKLISTED,
      `with correct error code: ERR_PROTOCOL_BLACKLISTED`
    );
  }
});

test('Query registered protocols', t => {
  const handler = new ProtocolHandler();
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
  const handler = new ProtocolHandler();
  const url = 's3://dummyKey';
  const expected = 'https://example.org';
  handler.protocol('s3:', url => expected);
  const actual = await handler.resolve(url);
  t.plan(1);
  t.equals(actual, expected, 'resolves url with registered protocol');
});

test('Resolve unknown protocol', async t => {
  const handler = new ProtocolHandler();
  const url = 's3://dummyKey';
  t.plan(2);
  try {
    await handler.resolve(url);
  } catch (err) {
    t.equals(err.name, ProtocolError.name, `throws ProtocolError: ${err.message}`);
    t.equals(
      err.code, ProtocolError.ERR_PROTOCOL_UNKNOWN,
      `with correct error code: ERR_PROTOCOL_UNKNOWN`
    );
  }
});

test('Resolve invalid protocol', async t => {
  const handler = new ProtocolHandler();
  const url = 'invalid@protocol://dummyKey';
  t.plan(2);
  try {
    await handler.resolve(url);
  } catch (err) {
    t.equals(err.name, ProtocolError.name, `throws ProtocolError: ${err.message}`);
    t.equals(
      err.code, ProtocolError.ERR_PROTOCOL_INVALID,
      `with correct error code: ERR_PROTOCOL_INVALID`
    );
  }
});

test('Resolve standard protocol', async t => {
  const handler = new ProtocolHandler();
  let expected = 'file:///local/file.txt';
  t.plan(2);
  t.equals(
    await handler.resolve(expected), expected,
    'resolves url with standard protocol: file:'
  );
  expected = 'https://example.com';
  t.equals(
    await handler.resolve(expected), expected,
    'resolves url with standard protocol: https:'
  );
});

test('Resolve protocol relative url', async t => {
  const handler = new ProtocolHandler();
  const expected = '//google.com';
  t.plan(1);
  t.equals(
    await handler.resolve(expected), expected,
    'resolves protocol relative url: //google.com'
  );
});

test('Handle registered protocol', t => {
  const handler = new ProtocolHandler();
  const url = 's3://dummyKey';
  const redirectUrl = 'https://example.org';
  t.plan(1);
  handler.protocol('s3:', url => redirectUrl);
  const mw = handler.middleware();
  const query = { url: encodeURIComponent(url) };
  const redirect = sinon.stub();
  mw({ query }, { redirect });
  setTimeout(() => t.equals(
    redirect.calledOnce && redirect.getCall(0).args[0], redirectUrl,
    'applies correct protocol handler'
  ), 0);
});

test('Handle unknown protocol', t => {
  const handler = new ProtocolHandler();
  const url = 's3://dummyKey';
  t.plan(1);
  handler.middleware();
  const mw = handler.middleware();
  const query = { url: encodeURIComponent(url) };
  const sendStatus = sinon.stub();
  mw({ query }, { sendStatus });
  setTimeout(() => t.equals(
    sendStatus.calledOnce && sendStatus.getCall(0).args[0], 400,
    'returns `400 Bad Request` if protocol is not registered'
  ), 0);
});
