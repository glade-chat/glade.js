'use strict';

import { User } from './User.js';
import { Routes } from '../rest/Routes.js';
import { SettableStatus } from '../util/Constants.js';

/**
 * Represents the currently logged-in account. Adds methods for editing the
 * profile, managing presence, and inspecting connected sessions.
 * @extends {User}
 */
export class ClientUser extends User {
  /**
   * Updates the live presence broadcast to other users (via the gateway).
   * @param {'online' | 'idle' | 'dnd'} status
   * @returns {this}
   */
  setPresence(status) {
    if (!SettableStatus.includes(status)) {
      throw new RangeError(`Status must be one of ${SettableStatus.join(', ')}`);
    }
    this.client.gateway.send('presence:set', status);
    this.status = status;
    return this;
  }

  /**
   * Edits the account profile.
   * @param {object} data
   * @param {string} [data.displayName]
   * @param {string | null} [data.avatarUrl]
   * @param {string | null} [data.bannerUrl]
   * @param {string} [data.bio]
   * @param {'online' | 'idle' | 'dnd'} [data.status]
   * @param {string} [data.publicKey]
   * @param {string} [data.currentPassword]
   * @param {string} [data.newPassword]
   * @returns {Promise<this>}
   */
  async edit(data) {
    const { user } = await this.client.rest.patch(Routes.me(), data);
    this._patch(user);
    return this;
  }

  /**
   * Sets both the persisted preferred status and the live presence.
   * @param {'online' | 'idle' | 'dnd'} status
   * @returns {Promise<this>}
   */
  async setStatus(status) {
    await this.edit({ status });
    if (this.client.gateway.connected) this.setPresence(status);
    return this;
  }

  /**
   * Sets the display name.
   * @param {string} displayName
   * @returns {Promise<this>}
   */
  setDisplayName(displayName) {
    return this.edit({ displayName });
  }

  /**
   * Sets the bio.
   * @param {string} bio
   * @returns {Promise<this>}
   */
  setBio(bio) {
    return this.edit({ bio });
  }

  /**
   * Sets the avatar. Accepts an existing URL string, or raw file data which is
   * uploaded first.
   * @param {string | Buffer | Uint8Array | Blob | null} avatar
   * @param {{ name?: string, contentType?: string }} [fileOptions]
   * @returns {Promise<this>}
   */
  async setAvatar(avatar, fileOptions = {}) {
    const avatarUrl = await this.#resolveImage(avatar, fileOptions);
    return this.edit({ avatarUrl });
  }

  /**
   * Sets the profile banner. Accepts a URL string or raw file data.
   * @param {string | Buffer | Uint8Array | Blob | null} banner
   * @param {{ name?: string, contentType?: string }} [fileOptions]
   * @returns {Promise<this>}
   */
  async setBanner(banner, fileOptions = {}) {
    const bannerUrl = await this.#resolveImage(banner, fileOptions);
    return this.edit({ bannerUrl });
  }

  /**
   * Sets the E2E identity public key.
   * @param {string} publicKey
   * @returns {Promise<this>}
   */
  setPublicKey(publicKey) {
    return this.edit({ publicKey });
  }

  /**
   * Changes the account password.
   * @param {string} currentPassword
   * @param {string} newPassword
   * @returns {Promise<this>}
   */
  setPassword(currentPassword, newPassword) {
    return this.edit({ currentPassword, newPassword });
  }

  /**
   * Lists the account's connected device sessions.
   * @returns {Promise<Array<{ id: string, userAgent: string | null, location: string | null, createdAt: string, lastSeenAt: string, current: boolean }>>}
   */
  async fetchSessions() {
    const { sessions } = await this.client.rest.get(Routes.sessions());
    return sessions;
  }

  /**
   * Revokes (signs out) a connected session.
   * @param {string} sessionId
   * @returns {Promise<void>}
   */
  async revokeSession(sessionId) {
    await this.client.rest.delete(Routes.session(sessionId));
  }

  async #resolveImage(image, fileOptions) {
    if (image === null || typeof image === 'string') return image;
    const { url } = await this.client.rest.upload(image, { ...fileOptions, kind: 'avatar' });
    return url;
  }
}

export default ClientUser;
