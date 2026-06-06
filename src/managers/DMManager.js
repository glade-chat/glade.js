'use strict';

import { CachedManager } from './CachedManager.js';
import { DMChannel } from '../structures/DMChannel.js';
import { Routes } from '../rest/Routes.js';
import { resolveId } from '../util/Util.js';

/**
 * Manages the client's direct-message channels.
 * @extends {CachedManager}
 */
export class DMManager extends CachedManager {
  constructor(client) {
    super(client, DMChannel);
  }

  /**
   * Fetches all of the client's DM channels.
   * @returns {Promise<import('../util/Collection.js').Collection<string, DMChannel>>}
   */
  async fetch() {
    const { dms } = await this.client.rest.get(Routes.dms());
    for (const dm of dms) this._add(dm);
    return this.cache;
  }

  /**
   * Opens (or returns the existing) DM channel with a user.
   * @param {string | import('../structures/User.js').User} user
   * @returns {Promise<DMChannel>}
   */
  async create(user) {
    const userId = resolveId(user);
    const { dm } = await this.client.rest.post(Routes.dms(), { userId });
    const channel = this._add({ id: dm.id });
    // The REST response only carries the channel id; remember the recipient.
    if (!channel.participantIds.includes(userId)) channel.participantIds.push(userId);
    if (typeof user === 'object') this.client.users._add(user);
    return channel;
  }
}

export default DMManager;
