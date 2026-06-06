'use strict';

import { Base } from './Base.js';
import { Routes } from '../rest/Routes.js';
import { MessageManager } from '../managers/MessageManager.js';
import { PermissionsBitField } from '../util/Permissions.js';
import { RoomTypes } from '../util/Constants.js';
import { resolveId } from '../util/Util.js';

/**
 * Base class for a Glade room (channel) inside a House.
 * @extends {Base}
 */
export class Room extends Base {
  constructor(client, data) {
    super(client);
    /** @type {string} The room id. */
    this.id = data.id;
    /** @type {MessageManager} Cache + helpers for this room's messages. */
    this.messages = new MessageManager(client, this);
    this._patch(data);
  }

  _patch(data) {
    if ('houseId' in data) {
      /** @type {string} Id of the House this room belongs to. */
      this.houseId = data.houseId;
    }
    if ('name' in data) {
      /** @type {string} The room name. */
      this.name = data.name;
    }
    if ('type' in data) {
      /** @type {string} The room type: text | voice | portal. */
      this.type = data.type;
    }
    if ('topic' in data) {
      /** @type {string | null} The room topic. */
      this.topic = data.topic ?? null;
    }
    if ('position' in data) {
      /** @type {number} The room's sort position. */
      this.position = data.position ?? 0;
    }
    if ('createdAt' in data) {
      /** @type {string | null} ISO creation timestamp. */
      this.createdAt = data.createdAt ?? null;
    }
    return data;
  }

  /** Whether this is a text room. */
  isText() {
    return this.type === RoomTypes.Text;
  }
  /** Whether this is a voice room. */
  isVoice() {
    return this.type === RoomTypes.Voice;
  }
  /** Whether this is a portal room. */
  isPortal() {
    return this.type === RoomTypes.Portal;
  }

  /** The House this room belongs to, if cached. */
  get house() {
    return this.client.houses.cache.get(this.houseId) ?? null;
  }

  /**
   * Sends a message to this room.
   * @param {string | import('../managers/MessageManager.js').MessagePayload} content
   * @returns {Promise<import('./Message.js').Message>}
   */
  send(content) {
    return this.client._sendMessage({ roomId: this.id }, content);
  }

  /**
   * Subscribes the gateway connection to this room so it receives the room's
   * realtime events (`messageCreate`, typing, reactions, pins, …). The client
   * auto-subscribes cached rooms on ready unless `autoSubscribeRooms` is disabled.
   * @returns {this}
   */
  subscribe() {
    this.client.gateway.send('room:join', this.id);
    return this;
  }

  /**
   * Unsubscribes the gateway connection from this room's realtime events.
   * @returns {this}
   */
  unsubscribe() {
    this.client.gateway.send('room:leave', this.id);
    return this;
  }

  /** Broadcasts a "typing…" indicator to the room. */
  sendTyping() {
    this.client.gateway.send('typing:start', { roomId: this.id });
    return this;
  }

  /** Stops the "typing…" indicator. */
  stopTyping() {
    this.client.gateway.send('typing:stop', { roomId: this.id });
    return this;
  }

  /**
   * Fetches a page of messages.
   * @param {{ cursor?: string, limit?: number }} [options]
   * @returns {Promise<{ messages: import('./Message.js').Message[], nextCursor: string | null }>}
   */
  fetchMessages(options) {
    return this.messages.fetch(options);
  }

  /** Fetches this room's pinned messages. */
  fetchPins() {
    return this.messages.fetchPins();
  }

  /**
   * Edits this room.
   * @param {{ name?: string, topic?: string | null }} data
   * @returns {Promise<Room>}
   */
  async edit(data) {
    const { room } = await this.client.rest.patch(Routes.room(this.id), data);
    this._patch(room);
    return this;
  }

  /** Sets the room name. */
  setName(name) {
    return this.edit({ name });
  }

  /** Sets the room topic (or null to clear). */
  setTopic(topic) {
    return this.edit({ topic });
  }

  /**
   * Clones this room's settings into a new room (messages are not copied).
   * @returns {Promise<Room>}
   */
  async clone() {
    const { room } = await this.client.rest.post(Routes.roomClone(this.id));
    return this.house ? this.house.rooms._add(room) : new Room(this.client, room);
  }

  /**
   * Deletes this room.
   * @returns {Promise<void>}
   */
  async delete() {
    await this.client.rest.delete(Routes.room(this.id));
    this.house?.rooms.cache.delete(this.id);
    this.client.channels.cache.delete(this.id);
  }

  /**
   * Lists this room's per-role permission overrides.
   * @returns {Promise<Array<{ id: string, roomId: string, roleId: string, allow: number, deny: number }>>}
   */
  async fetchPermissionOverrides() {
    const { permissions } = await this.client.rest.get(Routes.roomPermissions(this.id));
    return permissions;
  }

  /**
   * Sets (or clears) a role's permission override on this room. Pass `allow: 0, deny: 0` to clear.
   * @param {string | import('./Role.js').Role} role
   * @param {{ allow?: import('../util/Permissions.js').PermissionResolvable, deny?: import('../util/Permissions.js').PermissionResolvable }} options
   * @returns {Promise<void>}
   */
  async setPermissionOverride(role, { allow = 0, deny = 0 } = {}) {
    await this.client.rest.put(Routes.roomPermission(this.id, resolveId(role)), {
      allow: PermissionsBitField.resolve(allow),
      deny: PermissionsBitField.resolve(deny),
    });
  }

  toString() {
    return this.name;
  }
}

/**
 * A text room.
 * @extends {Room}
 */
export class TextRoom extends Room {}

/**
 * A portal room.
 * @extends {Room}
 */
export class PortalRoom extends Room {}

/**
 * A voice room. Adds WebRTC-mesh signaling helpers; actual audio transport is up
 * to the consumer (the gateway only relays SDP/ICE between peers).
 * @extends {Room}
 */
export class VoiceRoom extends Room {
  /**
   * Joins this voice room. Resolves with the current peers, so the caller can
   * begin WebRTC negotiation. Listen for `voicePeerJoin` / `voiceSignal` etc.
   * @returns {Promise<{ selfSocketId: string, participants: Array<{ socketId: string, userId: string, muted: boolean }> }>}
   */
  async join() {
    const ack = await this.client.gateway.request('voice:join', this.id);
    return { selfSocketId: ack.selfSocketId, participants: ack.participants ?? [] };
  }

  /** Leaves this voice room. */
  leave() {
    this.client.gateway.send('voice:leave', this.id);
    return this;
  }

  /**
   * Updates the client's mute/deafen state within this voice room.
   * @param {{ muted: boolean, deafened?: boolean }} state
   */
  setVoiceState(state) {
    this.client.gateway.send('voice:state', { roomId: this.id, ...state });
    return this;
  }

  /**
   * Relays a WebRTC signaling payload (SDP offer/answer or ICE candidate) to a peer.
   * @param {string} toSocketId
   * @param {any} data
   */
  signal(toSocketId, data) {
    this.client.gateway.send('voice:signal', { toSocketId, data });
    return this;
  }
}

/**
 * Instantiates the correct {@link Room} subclass for the given raw data.
 * @param {import('../client/Client.js').Client} client
 * @param {any} data
 * @returns {Room}
 */
export function createRoom(client, data) {
  switch (data.type) {
    case RoomTypes.Voice:
      return new VoiceRoom(client, data);
    case RoomTypes.Portal:
      return new PortalRoom(client, data);
    case RoomTypes.Text:
    default:
      return new TextRoom(client, data);
  }
}

export default Room;
