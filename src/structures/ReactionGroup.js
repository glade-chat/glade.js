'use strict';

/**
 * An aggregated reaction on a {@link Message}: one emoji and the users who reacted
 * with it. Mirrors the backend's `{ emoji, count, userIds }` shape.
 */
export class ReactionGroup {
  /**
   * @param {import('../client/Client.js').Client} client
   * @param {import('./Message.js').Message} message
   * @param {{ emoji: string, count: number, userIds: string[] }} data
   */
  constructor(client, message, data) {
    Object.defineProperty(this, 'client', { value: client });
    Object.defineProperty(this, 'message', { value: message });
    /** @type {string} The reaction emoji. */
    this.emoji = data.emoji;
    /** @type {number} How many users reacted with this emoji. */
    this.count = data.count;
    /** @type {string[]} Ids of the users who reacted. */
    this.userIds = data.userIds ?? [];
  }

  /** Whether the logged-in account reacted with this emoji. */
  get me() {
    const id = this.client.user?.id;
    return id ? this.userIds.includes(id) : false;
  }

  /** The reacting users that are present in the user cache. */
  get users() {
    return this.userIds
      .map((id) => this.client.users.cache.get(id))
      .filter((u) => Boolean(u));
  }

  toJSON() {
    return { emoji: this.emoji, count: this.count, userIds: this.userIds };
  }
}

export default ReactionGroup;
