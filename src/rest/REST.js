'use strict';

import { GladeAPIError } from '../errors/index.js';
import { Routes } from './Routes.js';
import { makeQuery, trimTrailingSlash } from '../util/Util.js';
import { REFRESH_COOKIE } from '../util/Constants.js';

/** Credential endpoints where a 401 means "bad credentials", not "expired session". */
const AUTH_ENDPOINTS = /^\/auth\/(login|register|forgot|reset|logout|refresh)/;

/**
 * The HTTP layer of glade.js. Talks to the Glade REST API, attaching the bearer
 * access token, persisting the `glade_rt` refresh cookie, and transparently
 * refreshing an expired access token on a 401 (single-flight, retried once).
 */
export class REST {
  /**
   * @param {object} [options]
   * @param {string} [options.base] REST origin without the version segment.
   * @param {string} [options.version] API version segment, e.g. `v1`.
   * @param {boolean} [options.autoRefresh] Refresh + retry on 401.
   * @param {(token: string) => void} [options.onToken] Called whenever a fresh access token is obtained.
   * @param {(msg: string) => void} [options.debug] Debug sink.
   */
  constructor(options = {}) {
    /** @type {string} The REST origin (without the version segment). */
    this.base = trimTrailingSlash(options.base ?? 'https://api.glade.chat');
    /** @type {string} */
    this.version = options.version ?? 'v1';
    /** @type {boolean} */
    this.autoRefresh = options.autoRefresh ?? true;
    /** @type {((token: string) => void) | null} */
    this.onToken = options.onToken ?? null;
    /** @type {((msg: string) => void) | null} */
    this._debug = options.debug ?? null;

    /** @type {string | null} The current access token. */
    this.token = null;
    /** @type {string | null} The raw `glade_rt` refresh cookie value. */
    this.refreshCookie = null;
    /** @type {Promise<string | null> | null} In-flight refresh, for single-flight. */
    this._refreshing = null;
  }

  /** The fully-qualified base, i.e. `<base>/<version>`. */
  get apiBase() {
    return `${this.base}/${this.version}`;
  }

  /**
   * Sets the access token used for the `Authorization` header.
   * @param {string | null} token
   * @returns {this}
   */
  setToken(token) {
    this.token = token ?? null;
    return this;
  }

  /**
   * Sets the refresh cookie value directly (e.g. when resuming a saved session).
   * @param {string | null} value
   * @returns {this}
   */
  setRefreshToken(value) {
    this.refreshCookie = value ?? null;
    return this;
  }

  /**
   * Performs a REST request.
   * @template T
   * @param {object} opts
   * @param {string} opts.method HTTP method.
   * @param {string} opts.path Path relative to the version prefix (use {@link Routes}).
   * @param {any} [opts.body] JSON body.
   * @param {Record<string, any>} [opts.query] Query parameters.
   * @param {Record<string, string>} [opts.headers] Extra headers.
   * @param {boolean} [opts.auth=true] Attach the bearer token.
   * @param {boolean} [opts.sendCookie=false] Attach the refresh cookie.
   * @param {BodyInit} [opts.rawBody] Pre-built body (e.g. FormData); bypasses JSON.
   * @param {boolean} [opts._retry] Internal: marks a post-refresh retry.
   * @returns {Promise<T>}
   */
  async request(opts) {
    const {
      method = 'GET',
      path,
      body,
      query,
      headers = {},
      auth = true,
      sendCookie = false,
      rawBody,
      _retry = false,
    } = opts;

    const url = `${this.apiBase}${path}${makeQuery(query)}`;
    const finalHeaders = { Accept: 'application/json', ...headers };

    if (auth && this.token) finalHeaders.Authorization = `Bearer ${this.token}`;
    if (sendCookie && this.refreshCookie) {
      finalHeaders.Cookie = `${REFRESH_COOKIE}=${this.refreshCookie}`;
    }

    let payload = rawBody;
    if (rawBody === undefined && body !== undefined) {
      finalHeaders['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    this.#debug(`${method} ${path}`);
    const res = await fetch(url, { method, headers: finalHeaders, body: payload });

    this.#captureCookies(res);

    // Refresh-and-retry on an expired access token.
    if (
      res.status === 401 &&
      this.autoRefresh &&
      auth &&
      !_retry &&
      !AUTH_ENDPOINTS.test(path)
    ) {
      const fresh = await this.refresh();
      if (fresh) return this.request({ ...opts, _retry: true });
    }

    if (res.status === 204) return /** @type {T} */ (undefined);

    let data = null;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!res.ok) {
      const message = (data && data.error) || res.statusText || 'Request failed';
      throw new GladeAPIError({
        status: res.status,
        message,
        method,
        path,
        details: data && data.details,
      });
    }

    return /** @type {T} */ (data);
  }

  /** Convenience helpers. */
  get(path, opts = {}) {
    return this.request({ ...opts, method: 'GET', path });
  }
  post(path, body, opts = {}) {
    return this.request({ ...opts, method: 'POST', path, body });
  }
  patch(path, body, opts = {}) {
    return this.request({ ...opts, method: 'PATCH', path, body });
  }
  put(path, body, opts = {}) {
    return this.request({ ...opts, method: 'PUT', path, body });
  }
  delete(path, opts = {}) {
    return this.request({ ...opts, method: 'DELETE', path });
  }

  /**
   * Exchanges the stored refresh cookie for a new access token. Single-flight:
   * concurrent callers share one in-flight request.
   * @returns {Promise<string | null>} The new access token, or null on failure.
   */
  refresh() {
    // Bot/user tokens have no refresh cookie — there is nothing to exchange.
    if (!this.refreshCookie) return Promise.resolve(null);
    if (this._refreshing) return this._refreshing;
    this._refreshing = (async () => {
      try {
        const data = await this.request({
          method: 'POST',
          path: Routes.refresh(),
          auth: false,
          sendCookie: true,
        });
        const token = data?.accessToken ?? null;
        if (token) {
          this.token = token;
          this.onToken?.(token);
          this.#debug('Access token refreshed');
        }
        return token;
      } catch (err) {
        this.#debug(`Refresh failed: ${err.message}`);
        return null;
      } finally {
        this._refreshing = null;
      }
    })();
    return this._refreshing;
  }

  /**
   * Uploads a file via multipart/form-data to `/uploads`.
   * @param {Buffer | Uint8Array | Blob} file File contents.
   * @param {object} [opts]
   * @param {string} [opts.name] File name.
   * @param {string} [opts.contentType] MIME type.
   * @param {'avatar' | 'attachment'} [opts.kind] Upload bucket; `avatar` for avatars/banners.
   * @returns {Promise<{ url: string, name: string, size: number, contentType: string }>}
   */
  async upload(file, opts = {}) {
    const form = new FormData();
    const blob =
      file instanceof Blob
        ? file
        : new Blob([file], { type: opts.contentType || 'application/octet-stream' });
    form.append('file', blob, opts.name || 'file');
    return this.request({
      method: 'POST',
      path: Routes.uploads(),
      query: opts.kind ? { kind: opts.kind } : undefined,
      rawBody: form,
    });
  }

  /** Reads `Set-Cookie` headers and stores the refresh cookie value. */
  #captureCookies(res) {
    let cookies = [];
    if (typeof res.headers.getSetCookie === 'function') {
      cookies = res.headers.getSetCookie();
    } else {
      const raw = res.headers.get('set-cookie');
      if (raw) cookies = [raw];
    }
    for (const cookie of cookies) {
      const match = cookie.match(new RegExp(`${REFRESH_COOKIE}=([^;]+)`));
      if (match) this.refreshCookie = match[1];
    }
  }

  #debug(msg) {
    this._debug?.(`[REST] ${msg}`);
  }
}

export default REST;
