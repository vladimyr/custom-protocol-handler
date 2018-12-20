'use strict';

const { URL } = require('url');
const debug = require('debug')('protocol-handler');
const pTry = require('p-try');

const BLACKLISTED_SCHEMES = ['http:', 'https:'];
const isValidScheme = str => /^[a-z0-9+]{2,}:$/.test(str);

/**
 * Create protocol handler
 * @class
 */
class ProtocolHandler {
  /**
   * @constructor
   * @param {String} [param='url'] name of query param containing target url
   * @param {ProtocolHandlerOptions} [options={}] protocol handler options
   */
  constructor(param = 'url', { blacklist = [] } = {}) {
    this._param = param;
    this._blacklist = [...BLACKLISTED_SCHEMES, ...blacklist];
    this._handlers = new Map();
  }

  /**
   * Register protocol handler
   * @param {String} scheme protocol scheme
   * @param {ProtocolCallback} handler protocol handler
   * @returns {ProtocolHandler} instance to allow chaining
   *
   *
   * @example
   * // register multiple handlers
   * const handler = new ProtocolHandler();
   * handler
   *   .protocol('s3://', resolve)
   *   .protocol('gdrive://', resolve);
   */
  protocol(scheme, handler) {
    debug('atempt register scheme: %s', scheme);
    scheme = normalize(scheme);
    if (this._blacklist.includes(scheme)) {
      throw new TypeError(`Registering handler for \`${scheme}\` is not allowed.`);
    }
    if (!isValidScheme(scheme)) {
      throw new TypeError('Invalid protocol provided.');
    }
    this._handlers.set(scheme, handler);
    debug('scheme registered: %s', scheme);
    return this;
  }

  /**
   * @property {Set<String>} protocols registered protocols
   *
   * @example
   * // check if protocol is registered
   * const handler = new ProtocolHandler();
   * handler.protocol('s3://', resolve);
   * console.log(handler.protocols.has('s3:'));
   * //=> true
   */
  get protocols() {
    return new Set(this._handlers.keys());
  }

  /**
   * Resolve url with registered protocol handler
   * @param {String} url target url
   * @returns {Promise<String>} resolved url, redirect location
   *
   * @example
   * // create handler
   * const handler = new ProtocolHandler();
   * handler.protocol('s3://', url => 'https://example.com');
   * // resolve url
   * handler.resolve('s3://test').then(url => console.log(url));
   * //=> https://example.com
   */
  resolve(url) {
    const protocol = getProtocol(url);
    debug('url=%s, protocol=%s', url, protocol);
    const handler = this._handlers.get(protocol);
    return pTry(() => handler && handler(url));
  }

  /**
   * Returns [Express](https://expressjs.com) middleware
   * @returns {function(IRequest, IResponse)} Express middleware
   *
   * @example
   * // create handler
   * const handler = new ProtocolHandler();
   * handler.protocol('s3://', resolve);
   * // attach to express app
   * app.use(handler.middleware());
   */
  middleware() {
    return async (req, res) => {
      const url = decodeURIComponent(req.query[this._param]);
      const redirectUrl = await this.resolve(url);
      debug('redirect url=%s', redirectUrl || '');
      if (!redirectUrl) return res.sendStatus(400);
      return res.redirect(redirectUrl);
    };
  }
}

/**
 * Create new ProtocolHandler instance
 * @name module.exports
 * @param {String} [param='url'] name of query param containing target url
 * @param {ProtocolHandlerOptions} [options={}] protocol handler options
 * @returns {ProtocolHandler} instance
 *
 * @example
 * const handler = require('express-protocol-handler')('query');
 */
module.exports = (param, options) => new ProtocolHandler(param, options);
module.exports.ProtocolHandler = ProtocolHandler;

function normalize(scheme = '') {
  return scheme.toLowerCase().trim().replace(/:\/\/$/, ':');
}

function getProtocol(url) {
  try {
    return new URL(url).protocol;
  } catch (err) {}
}

/**
 * @typedef {Object} ProtocolHandlerOptions
 * @property {Array<String>} [blacklist=[]] array of blacklisted schemes
 */

/**
 * Resolver function for specific protocol
 * @callback ProtocolCallback
 * @param {String} url target url
 * @returns {String|Promise<String>} resolved url _redirect location_
 *
 * @example
 * // Resolve gdrive urls
 * const { fetchInfo } = require('gdrive-file-info');
 *
 * async function resolve(url) {
 *   const itemId = new URL(url).pathname;
 *   const fileInfo = await fetchInfo(itemId);
 *   return fileInfo.downloadUrl;
 * }
 */
/**
 * @name IRequest
 * @desc Express server request
 * @typedef {import("@types/express").Request} IRequest
 * @see https://expressjs.com/en/4x/api.html#req
 */

/**
 * @name IResponse
 * @desc Express server response
 * @typedef {import("@types/express").Response} IResponse
 * @see https://expressjs.com/en/4x/api.html#res
 */
