'use strict';

import { CachedManager } from './CachedManager.js';
import { Member } from '../structures/Member.js';
import { Routes } from '../rest/Routes.js';

/**
 * Manages the members of a single House.
 * @extends {CachedManager}
 */
export class MemberManager extends CachedManager {
  /**
   * @param {import('../client/Client.js').Client} client
   * @param {import('../structures/House.js').House} house
   */
  constructor(client, house) {
    super(client, Member);
    /** @type {import('../structures/House.js').House} */
    Object.defineProperty(this, 'house', { value: house });
  }

  _create(data) {
    return new Member(this.client, this.house, data);
  }

  /**
   * Fetches all members, or returns a single member by id (fetching all first if
   * necessary, since there is no single-member endpoint).
   * @param {string} [id]
   * @param {{ force?: boolean }} [options]
   * @returns {Promise<import('../util/Collection.js').Collection<string, Member> | Member | null>}
   */
  async fetch(id, { force = false } = {}) {
    if (id && !force && this.cache.has(id)) return this.cache.get(id);
    const { members } = await this.client.rest.get(Routes.houseMembers(this.house.id));
    for (const member of members) this._add(member);
    return id ? (this.cache.get(id) ?? null) : this.cache;
  }
}

export default MemberManager;
