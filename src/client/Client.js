'use strict';

import { EventEmitter } from 'node:events';

import { REST } from '../rest/REST.js';
import { Gateway } from '../gateway/Gateway.js';
import { handleDispatch } from '../gateway/handleDispatch.js';
import { Routes } from '../rest/Routes.js';

import { HouseManager } from '../managers/HouseManager.js';
import { ChannelManager } from '../managers/ChannelManager.js';
import { UserManager } from '../managers/UserManager.js';
import { DMManager } from '../managers/DMManager.js';
import { FriendManager } from '../managers/FriendManager.js';

import { ClientUser } from '../structures/ClientUser.js';
import { Message } from '../structures/Message.js';
import { Invite } from '../structures/Invite.js';

import { GladeError } from '../errors/index.js';
import { DefaultOptions, Events } from '../util/Constants.js';
import { decodeJwt, generateNonce } from '../util/Util.js';

/**
 * The main hub for interacting with the Glade API. Create one, attach event
 * listeners, then call {@link Client#login}.
 *
 * @example
 * import { Client, Events } from 'glade.js';
 * const client = new Client();
 * client.on(Events.Ready, () => console.log(`Logged in as ${client.user.handle}`));
 * client.on(Events.MessageCreate, (msg) => {
 *   if (msg.content === '!ping') msg.reply('Pong!');
 * });
 * client.login({ handle: 'my-bot', password: process.env.GLADE_PASSWORD });
 *
 * @extends {EventEmitter}
 */
export class Client extends EventEmitter {
  /**
   * @param {Partial<typeof DefaultOptions> & { token?: string }} [options]
   */
  constructor(options = {}) {
    super();

    /**
     * The resolved client options. URLs default to the public Glade service; when
     * a custom `rest` is given without a `gateway`, the gateway falls back to it.
     * @type {typeof DefaultOptions}
     */
    this.options = {
      ...DefaultOptions,
      ...options,
      rest: options.rest ?? DefaultOptions.rest,
      gateway: options.gateway ?? options.rest ?? DefaultOptions.gateway,
      ws: { ...DefaultOptions.ws, ...(options.ws ?? {}) },
    };

    const debug = this.options.debug ? (msg) => this.emit(Events.Debug, msg) : null;

    /**
     * The REST/HTTP layer.
     * @type {REST}
     */
    this.rest = new REST({
      base: this.options.rest,
      version: this.options.version,
      autoRefresh: this.options.autoRefresh,
      onToken: (token) => this.#onToken(token),
      debug,
    });

    /**
     * The realtime gateway layer.
     * @type {Gateway}
     */
    this.gateway = new Gateway({
      url: this.options.gateway,
      getToken: () => this.rest.token,
      refresh: () => this.rest.refresh(),
      onDispatch: (event, data) => handleDispatch(this, event, data),
      onConnect: () => this.emit(Events.Debug, '[Gateway] socket connected'),
      onDisconnect: (reason) => this.emit(Events.Disconnect, reason),
      onError: (err) => this.#emitError(err),
      ws: this.options.ws,
      debug,
    });

    /** The logged-in account, available after {@link Client#login}. @type {ClientUser | null} */
    this.user = null;
    /** Whether the gateway has sent its initial `ready`. @type {boolean} */
    this.ready = false;

    // --- Managers ---
    /** @type {HouseManager} */
    this.houses = new HouseManager(this);
    /** @type {ChannelManager} */
    this.channels = new ChannelManager(this);
    /** @type {UserManager} */
    this.users = new UserManager(this);
    /** @type {DMManager} */
    this.dms = new DMManager(this);
    /** @type {FriendManager} */
    this.friends = new FriendManager(this);

    /** @type {ReturnType<typeof setTimeout> | null} */
    this._refreshTimer = null;
  }

  /** The current access token, if any. */
  get token() {
    return this.rest.token;
  }

  /** Whether the gateway is currently connected. */
  get connected() {
    return this.gateway.connected;
  }

  /**
   * Authenticates with a bot/user token and opens the gateway connection.
   *
   * Generate a token from your account settings in the Glade app, or
   * programmatically with {@link Client.requestToken}. Tokens are long-lived and
   * are sent both as the REST bearer and the gateway handshake credential.
   *
   * @param {string | { token: string }} token A bot/user token, or `{ token }`.
   * @returns {Promise<string>} The token in use.
   */
  async login(token) {
    const value = typeof token === 'string' ? token : token?.token;
    if (!value) {
      throw new GladeError(
        'login() requires a bot/user token. Generate one in your Glade account settings or with Client.requestToken().',
      );
    }
    this.rest.setToken(value);

    const { user } = await this.rest.get(Routes.authMe());
    this.#setUser(user);

    this.#scheduleRefresh(); // no-op for non-expiring tokens
    await this.#prefetch();
    this.gateway.connect();
    return this.rest.token;
  }

  /**
   * Mints a long-lived bot/user token from account credentials, without starting a
   * session. Use this once to obtain a token (store it securely), then pass it to
   * {@link Client#login}. A web sign-in (account settings) is the usual way to
   * create a token; this helper is for scripts and self-hosted setups.
   *
   * @param {object} opts
   * @param {string} opts.handle Account handle.
   * @param {string} opts.password Account password.
   * @param {string} [opts.code] Two-factor code, if 2FA is enabled.
   * @param {string} [opts.turnstileToken] Captcha token, if the deployment requires it.
   * @param {string} [opts.rest] Backend REST origin (defaults to the public Glade API).
   * @param {string} [opts.version] API version segment.
   * @returns {Promise<string>} The freshly-minted token.
   */
  static async requestToken({ handle, password, code, turnstileToken, rest, version } = {}) {
    if (!handle || !password) {
      throw new GladeError('requestToken() requires { handle, password }.');
    }
    const api = new REST({ base: rest ?? DefaultOptions.rest, version: version ?? DefaultOptions.version });
    const data = await api.post(Routes.login(), { handle, password, turnstileToken });
    if (data.twoFactorRequired) {
      if (!code) throw new GladeError('This account has two-factor enabled — pass a `code`.');
      const verified = await api.post(Routes.loginTwoFactor(), { pendingToken: data.pendingToken, code });
      api.setToken(verified.accessToken);
    } else {
      api.setToken(data.accessToken);
    }
    const { token } = await api.post(Routes.tokens());
    return token;
  }

  /**
   * Revokes the account's current token (and all others), returning a fresh one to
   * log in with next time. The active connection keeps working until you reconnect.
   * @returns {Promise<string>} The new token.
   */
  async resetToken() {
    const { token } = await this.rest.post(Routes.tokensReset());
    this.rest.setToken(token);
    return token;
  }

  /**
   * Disconnects the gateway and clears local state. The token itself remains valid
   * (use {@link Client#resetToken} to revoke it).
   * @returns {Promise<void>}
   */
  async logout() {
    this.destroy();
  }

  /**
   * Tears down the client: disconnects the gateway and cancels timers. The
   * caches are left intact.
   */
  destroy() {
    if (this._refreshTimer) clearTimeout(this._refreshTimer);
    this._refreshTimer = null;
    this.gateway.disconnect();
    this.ready = false;
  }

  /**
   * Previews an invite by code (no membership change).
   * @param {string} code
   * @returns {Promise<Invite>}
   */
  async fetchInvite(code) {
    const { invite } = await this.rest.get(Routes.invite(code));
    return new Invite(this, invite);
  }

  /**
   * Redeems an invite code, joining the House.
   * @param {string} code
   * @returns {Promise<import('../structures/House.js').House>}
   */
  async redeemInvite(code) {
    const { house } = await this.rest.post(Routes.inviteRedeem(code));
    return this.houses._add(house);
  }

  /**
   * Fetches the client's current subscription status.
   * @returns {Promise<any>}
   */
  fetchSubscription() {
    return this.rest.get(Routes.subscription());
  }

  // --- Internal helpers ---

  /**
   * Sends a message via the gateway (preferred) or REST, caches it, and returns
   * the resulting {@link Message}.
   * @param {{ roomId?: string, dmChannelId?: string }} target
   * @param {string | import('../managers/MessageManager.js').MessagePayload} content
   * @returns {Promise<Message>}
   * @protected
   */
  async _sendMessage(target, content) {
    const payload =
      typeof content === 'string' ? { content } : { ...content };
    const body = {
      ...target,
      content: payload.content,
      clientNonce: payload.nonce ?? generateNonce(),
    };
    if (payload.mentions) body.mentions = payload.mentions;

    let raw;
    if (this.gateway.connected) {
      const ack = await this.gateway.request('message:send', body);
      raw = ack.message;
    } else if (target.roomId) {
      const res = await this.rest.post(Routes.roomMessages(target.roomId), {
        content: body.content,
        clientNonce: body.clientNonce,
      });
      raw = res.message;
    } else {
      throw new GladeError('Cannot send a DM while the gateway is disconnected.');
    }
    return this._cacheMessage(raw);
  }

  /**
   * Inserts a raw message into the appropriate channel cache and returns a
   * {@link Message}.
   * @param {any} raw
   * @returns {Message}
   * @protected
   */
  _cacheMessage(raw) {
    if (raw.roomId) {
      const room = this.channels.cache.get(raw.roomId);
      if (room) return room.messages._add(raw);
    } else if (raw.dmChannelId) {
      const dm = this.dms.cache.get(raw.dmChannelId);
      if (dm) return dm.messages._add(raw);
    }
    return new Message(this, raw);
  }

  /**
   * Subscribes the gateway to every cached room's realtime events. Called on each
   * `ready` (initial connect and reconnects) so room messages/typing/reactions are
   * delivered — the server only auto-joins user/house/DM channels.
   * @protected
   */
  _subscribeCachedRooms() {
    if (this.options.autoSubscribeRooms === false) return;
    if (!this.gateway.connected) return;
    for (const room of this.channels.cache.values()) {
      this.gateway.send('room:join', room.id);
    }
  }

  #setUser(data) {
    this.user = new ClientUser(this, data);
    // Cache the client user as a regular user too, so it resolves by id.
    this.users.cache.set(this.user.id, this.user);
    return this.user;
  }

  async #prefetch() {
    const { fetchHouses = true, fetchDMs = true } = this.options;
    try {
      if (fetchHouses) {
        await this.houses.fetch();
        await Promise.all(
          this.houses.cache.map((house) =>
            Promise.all([house.rooms.fetch(), house.roles.fetch()]).catch(() => {}),
          ),
        );
      }
      if (fetchDMs) await this.dms.fetch();
    } catch (err) {
      this.emit(Events.Warn, `Prefetch failed: ${err.message}`);
    }
  }

  #scheduleRefresh() {
    if (this._refreshTimer) clearTimeout(this._refreshTimer);
    const token = this.rest.token;
    if (!token) return;
    const payload = decodeJwt(token);
    if (!payload?.exp) return;
    const ms = payload.exp * 1000 - Date.now() - this.options.refreshSkewMs;
    this._refreshTimer = setTimeout(() => {
      this.rest.refresh().catch(() => {});
    }, Math.max(ms, 1000));
    if (typeof this._refreshTimer.unref === 'function') this._refreshTimer.unref();
  }

  #onToken(token) {
    this.emit(Events.Debug, '[Client] Access token updated');
    this.#scheduleRefresh();
  }

  #emitError(err) {
    if (this.listenerCount(Events.Error) > 0) this.emit(Events.Error, err);
    else this.emit(Events.Debug, `[Client] Unhandled error: ${err?.message ?? err}`);
  }
}

export default Client;
