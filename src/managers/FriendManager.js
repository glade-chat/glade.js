'use strict';

import { Collection } from '../util/Collection.js';
import { Routes } from '../rest/Routes.js';
import { resolveId } from '../util/Util.js';

/**
 * Manages the client's friends and friend requests. Friends are {@link User}s,
 * cached both here (accepted friends) and in the global user cache.
 */
export class FriendManager {
  constructor(client) {
    Object.defineProperty(this, 'client', { value: client });
    /**
     * Accepted friends, keyed by user id.
     * @type {Collection<string, import('../structures/User.js').User>}
     */
    this.cache = new Collection();
  }

  /**
   * Fetches the client's accepted friends.
   * @returns {Promise<Collection<string, import('../structures/User.js').User>>}
   */
  async fetch() {
    const { friends } = await this.client.rest.get(Routes.friends());
    this.cache.clear();
    for (const friend of friends) {
      const user = this.client.users._add(friend);
      this.cache.set(user.id, user);
    }
    return this.cache;
  }

  /**
   * Fetches incoming and outgoing pending friend requests.
   * @returns {Promise<{ incoming: Array<{ id: string, user: import('../structures/User.js').User }>, outgoing: Array<{ id: string, user: import('../structures/User.js').User }> }>}
   */
  async fetchPending() {
    const data = await this.client.rest.get(Routes.friendsPending());
    const map = (list) =>
      list.map((entry) => ({ id: entry.id, user: this.client.users._add(entry.user) }));
    return { incoming: map(data.incoming ?? []), outgoing: map(data.outgoing ?? []) };
  }

  /**
   * Sends a friend request by handle. If the target had already requested you, the
   * friendship is accepted instead (`accepted: true`).
   * @param {string} handle
   * @returns {Promise<{ accepted: boolean, user: import('../structures/User.js').User }>}
   */
  async add(handle) {
    const { accepted, target } = await this.client.rest.post(Routes.friends(), { handle });
    const user = this.client.users._add(target);
    if (accepted) this.cache.set(user.id, user);
    return { accepted, user };
  }

  /**
   * Accepts an incoming friend request.
   * @param {string} requestId The friendship id from {@link FriendManager#fetchPending}.
   * @returns {Promise<void>}
   */
  async accept(requestId) {
    await this.client.rest.post(Routes.friendAccept(requestId));
  }

  /**
   * Declines an incoming request, or cancels an outgoing one.
   * @param {string} requestId
   * @returns {Promise<void>}
   */
  async decline(requestId) {
    await this.client.rest.post(Routes.friendDecline(requestId));
  }

  /**
   * Removes an existing friend.
   * @param {string | import('../structures/User.js').User} user
   * @returns {Promise<void>}
   */
  async remove(user) {
    const id = resolveId(user);
    await this.client.rest.delete(Routes.friendRemove(id));
    this.cache.delete(id);
  }
}

export default FriendManager;
