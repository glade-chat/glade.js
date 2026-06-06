'use strict';

import { CachedManager } from './CachedManager.js';
import { Message } from '../structures/Message.js';
import { Routes } from '../rest/Routes.js';

/**
 * Manages the cached messages of a single room or DM channel.
 * @extends {CachedManager}
 *
 * @typedef {object} MessagePayload
 * @property {string} content The message content (may be E2E ciphertext).
 * @property {string} [nonce] A client nonce echoed back for optimistic dedupe.
 * @property {string[]} [mentions] Explicit mentioned user ids (needed when content is encrypted).
 */
export class MessageManager extends CachedManager {
  /**
   * @param {import('../client/Client.js').Client} client
   * @param {import('../structures/Room.js').Room | import('../structures/DMChannel.js').DMChannel} channel
   */
  constructor(client, channel) {
    super(client, Message);
    /** @type {import('../structures/Room.js').Room | import('../structures/DMChannel.js').DMChannel} */
    Object.defineProperty(this, 'channel', { value: channel });
  }

  /** Whether the owning channel is a DM. */
  get isDM() {
    return typeof this.channel.isDM === 'function' && this.channel.isDM();
  }

  /**
   * Fetches a page of messages (ascending order), newest page first via `cursor`.
   * @param {{ cursor?: string, limit?: number }} [options]
   * @returns {Promise<{ messages: Message[], nextCursor: string | null }>}
   */
  async fetch({ cursor, limit } = {}) {
    const path = this.isDM
      ? Routes.dmMessages(this.channel.id)
      : Routes.roomMessages(this.channel.id);
    const data = await this.client.rest.get(path, { query: { cursor, limit } });
    const messages = data.messages.map((m) => this._add(m));
    return { messages, nextCursor: data.nextCursor ?? null };
  }

  /**
   * Fetches the room's pinned messages (rooms only).
   * @returns {Promise<Message[]>}
   */
  async fetchPins() {
    if (this.isDM) throw new Error('DM channels do not support pinned messages');
    const { messages } = await this.client.rest.get(Routes.roomPins(this.channel.id));
    return messages.map((m) => this._add(m));
  }

  /**
   * Sends a message to this channel.
   * @param {string | MessagePayload} content
   * @returns {Promise<Message>}
   */
  send(content) {
    const target = this.isDM
      ? { dmChannelId: this.channel.id }
      : { roomId: this.channel.id };
    return this.client._sendMessage(target, content);
  }
}

export default MessageManager;
