'use strict';

import { Base } from './Base.js';

/**
 * Represents a Glade user. Built from the backend's "public user" shape; message
 * authors carry a reduced set of fields (id, handle, displayName, avatarUrl, bot).
 * @extends {Base}
 */
export class User extends Base {
  constructor(client, data) {
    super(client);
    /** @type {string} The user's unique id. */
    this.id = data.id;
    this._patch(data);
  }

  _patch(data) {
    if ('handle' in data) {
      /** @type {string} The user's unique @handle. */
      this.handle = data.handle;
    }
    if ('displayName' in data) {
      /** @type {string} The user's chosen display name. */
      this.displayName = data.displayName;
    }
    if ('avatarUrl' in data) {
      /** @type {string | null} URL of the user's avatar, if set. */
      this.avatarUrl = data.avatarUrl ?? null;
    }
    if ('bannerUrl' in data) {
      /** @type {string | null} URL of the user's profile banner, if set. */
      this.bannerUrl = data.bannerUrl ?? null;
    }
    if ('bio' in data) {
      /** @type {string | null} The user's bio. */
      this.bio = data.bio ?? null;
    }
    if ('status' in data) {
      /** @type {string} The user's presence status (online | idle | dnd | offline). */
      this.status = data.status ?? 'offline';
    }
    // The profile endpoint (GET /users/:id) carries the authoritative *live*
    // presence under `presence`, alongside the stored `status` — prefer it.
    if ('presence' in data) {
      this.status = data.presence ?? this.status ?? 'offline';
    }
    if ('isBot' in data) {
      /** @type {boolean} Whether this account is a bot. */
      this.bot = Boolean(data.isBot);
    }
    if ('badges' in data) {
      /** @type {string[]} Cosmetic badge ids granted to the user. */
      this.badges = data.badges ?? [];
    }
    if ('publicKey' in data) {
      /** @type {string | null} The user's E2E identity public key (base64 SPKI). */
      this.publicKey = data.publicKey ?? null;
    }
    if ('twoFactorEnabled' in data) {
      /** @type {boolean} Whether the user has two-factor enabled. */
      this.twoFactorEnabled = Boolean(data.twoFactorEnabled);
    }
    if ('createdAt' in data) {
      /**
       * ISO timestamp of when the account was created.
       * @type {string | null}
       * @remarks Only the profile endpoint (`users.fetch(id)`) returns this; the
       * self/auth payloads omit it, so `client.user.createdAt` may be `null`.
       */
      this.createdAt = data.createdAt ?? null;
    }
    return data;
  }

  /** The `@handle` form, suitable for mentions in message content. */
  get tag() {
    return `@${this.handle}`;
  }

  /**
   * Opens (or fetches the existing) DM channel with this user.
   * @returns {Promise<import('./DMChannel.js').DMChannel>}
   */
  createDM() {
    return this.client.dms.create(this.id);
  }

  /**
   * Sends a direct message to this user, opening a DM channel if necessary.
   * @param {string | import('../managers/MessageManager.js').MessagePayload} content
   * @returns {Promise<import('./Message.js').Message>}
   */
  async send(content) {
    const dm = await this.createDM();
    return dm.send(content);
  }

  /**
   * Re-fetches this user's full profile from the API.
   * @returns {Promise<User>}
   */
  fetch() {
    return this.client.users.fetch(this.id, { force: true });
  }

  /** Mentions the user (`@handle`). */
  toString() {
    return this.tag;
  }
}

export default User;
