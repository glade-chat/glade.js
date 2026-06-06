'use strict';

import { io } from 'socket.io-client';
import { GladeGatewayError } from '../errors/index.js';

/**
 * The realtime layer of glade.js: a thin wrapper around a Socket.IO client
 * connection to the Glade gateway. It authenticates the handshake with the
 * client's access token, transparently refreshes + reconnects when the token
 * expires, and forwards every server dispatch to a single handler.
 */
export class Gateway {
  /**
   * @param {object} opts
   * @param {string} opts.url Gateway origin.
   * @param {() => (string | null)} opts.getToken Returns the current access token.
   * @param {() => Promise<string | null>} opts.refresh Refreshes the token; returns the new one.
   * @param {(event: string, data: any) => void} opts.onDispatch Receives every server event.
   * @param {() => void} [opts.onConnect]
   * @param {(reason: string) => void} [opts.onDisconnect]
   * @param {(err: Error) => void} [opts.onError]
   * @param {(msg: string) => void} [opts.debug]
   * @param {object} [opts.ws] Extra socket.io-client options.
   */
  constructor(opts) {
    this.url = opts.url;
    this.getToken = opts.getToken;
    this.refresh = opts.refresh;
    this.onDispatch = opts.onDispatch;
    this.onConnect = opts.onConnect ?? (() => {});
    this.onDisconnect = opts.onDisconnect ?? (() => {});
    this.onError = opts.onError ?? (() => {});
    this._debug = opts.debug ?? null;
    this.wsOptions = opts.ws ?? {};

    /** @type {import('socket.io-client').Socket | null} */
    this.socket = null;
    /** @type {string | null} The socket id assigned on connect. */
    this.id = null;
    this._refreshingHandshake = false;
    /** Consecutive handshake-refresh attempts, reset on a successful connect. */
    this._handshakeRefreshAttempts = 0;
    /** Cap on consecutive handshake refreshes to avoid a reconnect loop. */
    this._maxHandshakeRefresh = opts.maxHandshakeRefresh ?? 5;
  }

  /** Whether the underlying socket is currently connected. */
  get connected() {
    return Boolean(this.socket?.connected);
  }

  /**
   * Opens the gateway connection. Safe to call once; subsequent calls reconnect
   * the existing socket.
   */
  connect() {
    if (this.socket) {
      if (!this.socket.connected) this.socket.connect();
      return;
    }

    this.#debug(`Connecting to ${this.url}`);
    this.socket = io(this.url, {
      autoConnect: false,
      withCredentials: true,
      auth: (cb) => cb({ token: this.getToken() }),
      ...this.wsOptions,
    });

    this.socket.on('connect', () => {
      this.id = this.socket.id;
      this._handshakeRefreshAttempts = 0;
      this.#debug(`Connected (socket ${this.id})`);
      this.onConnect();
    });

    this.socket.on('disconnect', (reason) => {
      this.#debug(`Disconnected: ${reason}`);
      this.onDisconnect(reason);
    });

    // If the handshake is rejected for an expired/invalid token, refresh once and
    // reconnect; the auth callback re-reads the token on the next attempt.
    this.socket.on('connect_error', async (err) => {
      this.#debug(`connect_error: ${err.message}`);
      const tokenError = err.message?.toLowerCase().includes('token');
      const canRefresh =
        tokenError &&
        !this._refreshingHandshake &&
        this._handshakeRefreshAttempts < this._maxHandshakeRefresh;
      if (canRefresh) {
        this._refreshingHandshake = true;
        this._handshakeRefreshAttempts += 1;
        try {
          const fresh = await this.refresh();
          if (fresh) this.socket.connect();
          else this.onError(new GladeGatewayError(`Gateway auth failed: ${err.message}`));
        } finally {
          this._refreshingHandshake = false;
        }
      } else {
        this.onError(new GladeGatewayError(err.message));
      }
    });

    // Forward every server-sent event to the dispatch handler.
    this.socket.onAny((event, ...args) => {
      this.onDispatch(event, args.length <= 1 ? args[0] : args);
    });

    this.socket.connect();
  }

  /** Closes the gateway connection. */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.id = null;
    }
  }

  /**
   * Emits an event to the server without waiting for an acknowledgement.
   * @param {string} event
   * @param {...any} args
   */
  send(event, ...args) {
    if (!this.socket) throw new GladeGatewayError('Gateway is not connected');
    this.socket.emit(event, ...args);
  }

  /**
   * Emits an event and resolves with the server's acknowledgement. Rejects with a
   * {@link GladeGatewayError} when the ack reports `ok: false` (e.g. rate limited).
   * @param {string} event
   * @param {any} [payload]
   * @param {number} [timeout=15000] ms before rejecting.
   * @returns {Promise<any>}
   */
  request(event, payload, timeout = 15_000) {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new GladeGatewayError('Gateway is not connected'));
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new GladeGatewayError(`Gateway request "${event}" timed out`));
      }, timeout);

      const ack = (response) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (response && response.ok === false) {
          reject(new GladeGatewayError(response.error || `"${event}" failed`, response.code));
        } else {
          resolve(response);
        }
      };

      if (payload === undefined) this.socket.emit(event, ack);
      else this.socket.emit(event, payload, ack);
    });
  }

  #debug(msg) {
    this._debug?.(`[Gateway] ${msg}`);
  }
}

export default Gateway;
