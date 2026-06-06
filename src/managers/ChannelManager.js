'use strict';

import { CachedManager } from './CachedManager.js';
import { Room } from '../structures/Room.js';

/**
 * The client-wide cache of rooms (channels) across every House the client is in.
 * Rooms are added here by each House's {@link RoomManager}. There is no single-room
 * REST endpoint, so {@link ChannelManager#fetch} resolves a room by fetching its
 * House's rooms when necessary.
 * @extends {CachedManager}
 */
export class ChannelManager extends CachedManager {
  constructor(client) {
    super(client, Room);
  }

  /**
   * Resolves a room by id from the cache, fetching its House's rooms if needed.
   * @param {string} id
   * @param {{ force?: boolean }} [options]
   * @returns {Promise<Room | null>}
   */
  async fetch(id, { force = false } = {}) {
    if (!force && this.cache.has(id)) return this.cache.get(id);
    // Find which cached House owns it, then refresh that House's rooms.
    const cached = this.cache.get(id);
    const houseId = cached?.houseId;
    if (houseId) {
      const house = this.client.houses.cache.get(houseId);
      if (house) {
        await house.rooms.fetch();
        return this.cache.get(id) ?? null;
      }
    }
    return this.cache.get(id) ?? null;
  }
}

export default ChannelManager;
