'use strict';

/**
 * Base error class for all errors thrown by glade.js.
 */
export class GladeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GladeError';
  }
}

/**
 * Thrown when a REST request resolves with a non-2xx response. The backend's
 * error body shape is `{ error: string }` (with optional Zod `details`).
 */
export class GladeAPIError extends GladeError {
  /**
   * @param {object} opts
   * @param {number} opts.status HTTP status code.
   * @param {string} opts.message Human-readable error message from the server.
   * @param {string} opts.method HTTP method used.
   * @param {string} opts.path Request path (after the version prefix).
   * @param {any} [opts.details] Validation details, if the server returned them.
   */
  constructor({ status, message, method, path, details }) {
    super(`${method} ${path} → ${status} ${message}`);
    this.name = 'GladeAPIError';
    /** @type {number} */
    this.status = status;
    /** @type {string} */
    this.rawMessage = message;
    /** @type {string} */
    this.method = method;
    /** @type {string} */
    this.path = path;
    /** @type {any} */
    this.details = details ?? null;
  }
}

/**
 * Thrown when the realtime gateway reports an error, including failed acks on
 * gateway commands (e.g. a rate-limited `message:send`).
 */
export class GladeGatewayError extends GladeError {
  /**
   * @param {string} message
   * @param {string} [code] Optional code from the server ack (e.g. `rate_limit`, `forbidden`).
   */
  constructor(message, code) {
    super(message);
    this.name = 'GladeGatewayError';
    /** @type {string | null} */
    this.code = code ?? null;
  }
}

export default { GladeError, GladeAPIError, GladeGatewayError };
