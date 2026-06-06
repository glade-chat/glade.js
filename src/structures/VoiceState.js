'use strict';

/**
 * A lightweight snapshot of a user's state inside a voice room, as reported by the
 * gateway's voice occupancy / peer events.
 */
export class VoiceState {
  /**
   * @param {import('../client/Client.js').Client} client
   * @param {{ userId: string, muted?: boolean, deafened?: boolean, socketId?: string, roomId?: string }} data
   */
  constructor(client, data) {
    Object.defineProperty(this, 'client', { value: client });
    /** @type {string} Id of the user this state describes. */
    this.userId = data.userId;
    /** @type {string | null} Id of the voice room, if known. */
    this.roomId = data.roomId ?? null;
    /** @type {string | null} The peer's socket id, for per-peer events. */
    this.socketId = data.socketId ?? null;
    /** @type {boolean} Whether the user is muted. */
    this.muted = Boolean(data.muted);
    /** @type {boolean} Whether the user is deafened. */
    this.deafened = Boolean(data.deafened);
  }

  /** The {@link User} this state belongs to, if cached. */
  get user() {
    return this.client.users.cache.get(this.userId) ?? null;
  }

  toJSON() {
    return {
      userId: this.userId,
      roomId: this.roomId,
      socketId: this.socketId,
      muted: this.muted,
      deafened: this.deafened,
    };
  }
}

export default VoiceState;
