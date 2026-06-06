'use strict';

import { CachedManager } from './CachedManager.js';
import { House } from '../structures/House.js';
import { Routes } from '../rest/Routes.js';

/**
 * Manages the Houses the client is a member of.
 * @extends {CachedManager}
 */
export class HouseManager extends CachedManager {
  constructor(client) {
    super(client, House);
  }

  /**
   * Fetches all of the client's Houses, or a single House by id.
   * @param {string} [id] If provided, fetches just that House (with its rooms).
   * @param {{ force?: boolean }} [options]
   * @returns {Promise<import('../util/Collection.js').Collection<string, House> | House>}
   */
  async fetch(id, { force = false } = {}) {
    if (id) {
      if (!force && this.cache.has(id)) return this.cache.get(id);
      const { house } = await this.client.rest.get(Routes.house(id));
      return this._add(house);
    }
    const { houses } = await this.client.rest.get(Routes.houses());
    for (const house of houses) this._add(house);
    return this.cache;
  }

  /**
   * Creates a new House owned by the client.
   * @param {string} name
   * @returns {Promise<House>}
   */
  async create(name) {
    const { house } = await this.client.rest.post(Routes.houses(), { name });
    return this._add(house);
  }
}

export default HouseManager;
