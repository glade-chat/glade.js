'use strict';

/**
 * Generates a short, unlikely-to-collide nonce used to correlate an optimistically
 * sent message with its `message:new` echo from the gateway.
 * @returns {string}
 */
export function generateNonce() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Decodes the payload of a JWT without verifying its signature. Used only to read
 * the access token's `exp` so the client can refresh proactively.
 * @param {string} token
 * @returns {Record<string, any> | null}
 */
export function decodeJwt(token) {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Builds a query string (with leading `?`) from an object, skipping
 * `undefined`/`null` values. Returns `''` when there is nothing to encode.
 * @param {Record<string, any>} [query]
 * @returns {string}
 */
export function makeQuery(query) {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params.append(key, String(value));
  }
  const str = params.toString();
  return str ? `?${str}` : '';
}

/**
 * Trims any trailing slashes from a URL/origin.
 * @param {string} url
 * @returns {string}
 */
export function trimTrailingSlash(url) {
  return String(url).replace(/\/+$/, '');
}

/**
 * Resolves something to its id: accepts a raw id string or any object with an `id`.
 * @param {string | { id: string }} value
 * @returns {string}
 */
export function resolveId(value) {
  return typeof value === 'string' ? value : value?.id;
}
