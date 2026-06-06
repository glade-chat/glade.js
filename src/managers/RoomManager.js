'use strict';

import { CachedManager } from './CachedManager.js';
import { Room, createRoom } from '../structures/Room.js';
import { Routes } from '../rest/Routes.js';

/**
 * Manages the rooms (channels) of a single House. Entries are also mirrored into
 * the client-wide {@link ChannelManager} cache.
 * @extends {CachedManager}
 */
export class RoomManager extends CachedManager {
  /**
   * @param {import('../client/Client.js').Client} client
   * @param {import('../structures/House.js').House} house
   */
  constructor(client, house) {
    super(client, Room);
    /** @type {import('../structures/House.js').House} */
    Object.defineProperty(this, 'house', { value: house });
  }

  _create(data) {
    return createRoom(this.client, { ...data, houseId: data.houseId ?? this.house.id });
  }

  _add(data, cache = true) {
    const isNew = data.id != null && !this.cache.has(data.id);
    const room = super._add(data, cache);
    // Mirror into the global channel cache so rooms resolve by id anywhere.
    if (cache && this.client.options.cache) this.client.channels.cache.set(room.id, room);
    // Subscribe to realtime events for rooms discovered while already connected
    // (rooms cached before connect are handled by Client on the `ready` event).
    if (
      isNew &&
      this.client.options.autoSubscribeRooms !== false &&
      this.client.gateway?.connected
    ) {
      this.client.gateway.send('room:join', room.id);
    }
    return room;
  }

  /**
   * Fetches all rooms in this House (filtered to those the client can view).
   * @returns {Promise<import('../util/Collection.js').Collection<string, Room>>}
   */
  async fetch() {
    const { rooms } = await this.client.rest.get(Routes.houseRooms(this.house.id));
    for (const room of rooms) this._add(room);
    return this.cache;
  }

  /**
   * Creates a room in this House. Requires `ManageChannels`.
   * @param {string} name
   * @param {{ type?: 'text' | 'voice' | 'portal' }} [options]
   * @returns {Promise<Room>}
   */
  async create(name, { type } = {}) {
    const { room } = await this.client.rest.post(Routes.houseRooms(this.house.id), { name, type });
    return this._add(room);
  }

  /**
   * Reorders the House's rooms.
   * @param {Array<string | Room>} orderedIds
   * @returns {Promise<import('../util/Collection.js').Collection<string, Room>>}
   */
  async reorder(orderedIds) {
    const ids = orderedIds.map((r) => this.resolveId(r));
    const { rooms } = await this.client.rest.post(Routes.houseRoomsReorder(this.house.id), {
      orderedIds: ids,
    });
    for (const room of rooms) this._add(room);
    return this.cache;
  }
}

export default RoomManager;
