'use strict';

import { CachedManager } from './CachedManager.js';
import { User } from '../structures/User.js';
import { Routes } from '../rest/Routes.js';

/**
 * The client-wide cache of known users.
 * @extends {CachedManager}
 */
export class UserManager extends CachedManager {
  constructor(client) {
    super(client, User);
  }

  /**
   * Fetches a user's full profile by id.
   * @param {string} id
   * @param {{ force?: boolean }} [options]
   * @returns {Promise<User>}
   */
  async fetch(id, { force = false } = {}) {
    if (!force && this.cache.has(id)) return this.cache.get(id);
    const { profile } = await this.client.rest.get(Routes.user(id));
    return this._add(profile);
  }

  /**
   * Searches the client's contacts (accepted friends + existing DM partners).
   * @param {string} [query]
   * @returns {Promise<User[]>}
   */
  async search(query = '') {
    const { users } = await this.client.rest.get(Routes.userSearch(), {
      query: { q: query },
    });
    return users.map((u) => this._add(u));
  }
}

export default UserManager;
