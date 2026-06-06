'use strict';

import { CachedManager } from './CachedManager.js';
import { Invite } from '../structures/Invite.js';
import { Routes } from '../rest/Routes.js';

/**
 * Manages the invites of a single House.
 * @extends {CachedManager}
 */
export class InviteManager extends CachedManager {
  /**
   * @param {import('../client/Client.js').Client} client
   * @param {import('../structures/House.js').House} house
   */
  constructor(client, house) {
    super(client, Invite);
    /** @type {import('../structures/House.js').House} */
    Object.defineProperty(this, 'house', { value: house });
  }

  /**
   * Fetches all active invites for this House.
   * @returns {Promise<import('../util/Collection.js').Collection<string, Invite>>}
   */
  async fetch() {
    const { invites } = await this.client.rest.get(Routes.houseInvites(this.house.id));
    for (const invite of invites) this._add(invite);
    return this.cache;
  }

  /**
   * Creates an invite to this House.
   * @param {{ expiresInMinutes?: number | null, maxUses?: number | null }} [options]
   * @returns {Promise<Invite>}
   */
  async create({ expiresInMinutes, maxUses } = {}) {
    const { invite } = await this.client.rest.post(Routes.houseInvites(this.house.id), {
      expiresInMinutes,
      maxUses,
    });
    return this._add({ ...invite, house: { id: this.house.id, name: this.house.name } });
  }
}

export default InviteManager;
