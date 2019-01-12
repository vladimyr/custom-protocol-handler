'use strict';

const { ProtocolHandler, ProtocolError } = require('./');
const express = require('express');
const request = require('supertest');
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

test('Handle registered protocol (express middleware)', t => {
  const url = 's3://dummyKey';
  const redirectUrl = 'https://example.org';
  const handler = new ProtocolHandler();
  handler.protocol('s3:', url => redirectUrl);
  const app = express();
  app.get('/resolve', handler.middleware());
  t.plan(1);
  request(app)
    .get('/resolve')
    .query({ url })
    .expect('Location', redirectUrl, err =>
      t.ifError(err, `redirects: ${url} to: ${redirectUrl}`));
});

test('Handle unknown protocol (express middleware)', t => {
  const redirectUrl = 'https://example.org';
  const handler = new ProtocolHandler();
  handler.protocol('s3:', url => redirectUrl);
  const app = express();
  app.get('/resolve', handler.middleware());
  t.plan(4);
  request(app)
    .get('/resolve')
    .query({ url: 'unknown://dummyKey' })
    .then(res => {
      t.equals(res.status, 400, `sends back: \`400 Bad Request\``);
      const { error } = res.body;
      t.assert(error, 'response has error property');
      t.equals(error.name, ProtocolError.name, 'with correct name');
      t.equals(
        error.code, ProtocolError.ERR_PROTOCOL_UNKNOWN,
        'with error code: ERR_PROTOCOL_UNKNOWN'
      );
    });
});

test('Handle invalid protocol (express middleware)', t => {
  const redirectUrl = 'https://example.org';
  const handler = new ProtocolHandler();
  handler.protocol('s3:', url => redirectUrl);
  const app = express();
  app.get('/resolve', handler.middleware());
  t.plan(4);
  request(app)
    .get('/resolve')
    .query({ url: 'invalid-$cheme://dummyKey' })
    .then(res => {
      t.equals(res.status, 400, `sends back: \`400 Bad Request\``);
      const { error } = res.body;
      t.assert(error, 'response has error property');
      t.equals(error.name, ProtocolError.name, 'with correct name');
      t.equals(
        error.code, ProtocolError.ERR_PROTOCOL_INVALID,
        'with error code: ERR_PROTOCOL_INVALID'
      );
    });
});

test('Handle standard protocol (express middleware)', t => {
  const url = 'https://google.com';
  const redirectUrl = 'https://example.org';
  const handler = new ProtocolHandler();
  handler.protocol('s3:', url => redirectUrl);
  const app = express();
  app.get('/resolve', handler.middleware());
  t.plan(1);
  request(app)
    .get('/resolve')
    .query({ url })
    .expect('Location', url, err =>
      t.ifError(err, `redirects: ${url} to: ${redirectUrl}`));
});

test('Handle protocol relative url (express middleware)', t => {
  const url = '//google.com';
  const redirectUrl = 'https://example.org';
  const handler = new ProtocolHandler();
  handler.protocol('s3:', url => redirectUrl);
  const app = express();
  app.get('/resolve', handler.middleware());
  t.plan(1);
  request(app)
    .get('/resolve')
    .query({ url })
    .expect('Location', url, err =>
      t.ifError(err, `redirects: ${url} to: ${redirectUrl}`));
});

test('Handle standard protocol (express middleware, custom callback)', t => {
  const url = 'https://google.com';
  const redirectUrl = 'https://example.org';
  const handler = new ProtocolHandler();
  handler.protocol('s3:', url => redirectUrl);
  const app = express();
  app.get('/resolve', handler.middleware('url', (err, url, res) => {
    if (err.code !== ProtocolError.ERR_PROTOCOL_BLACKLISTED) {
      return res.sendStatus(400);
    }
    res.redirect(url);
  }));
  t.plan(2);
  request(app)
    .get('/resolve')
    .query({ url })
    .expect('Location', url, err =>
      t.ifError(err, `redirects blacklisted to given url`));
  request(app)
    .get('/resolve')
    .query({ url: 'unknown://dummyKey' })
    .expect(400, err => t.ifError(err, `sends back: \`400 Bad Request\` for others`));
});
