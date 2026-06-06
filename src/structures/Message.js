'use strict';

import { Base } from './Base.js';
import { Routes } from '../rest/Routes.js';
import { ReactionGroup } from './ReactionGroup.js';

/**
 * Represents a message in a room or DM channel.
 * @extends {Base}
 */
export class Message extends Base {
  constructor(client, data) {
    super(client);
    /** @type {string} The message id. */
    this.id = data.id;
    this._patch(data);
  }

  _patch(data) {
    if ('roomId' in data) {
      /** @type {string | null} Id of the room this message was sent in, if any. */
      this.roomId = data.roomId ?? null;
    }
    if ('dmChannelId' in data) {
      /** @type {string | null} Id of the DM channel this message was sent in, if any. */
      this.dmChannelId = data.dmChannelId ?? null;
    }
    if ('houseId' in data) {
      /** @type {string | null} Id of the House the room belongs to (null for DMs). */
      this.houseId = data.houseId ?? null;
    }
    if ('content' in data) {
      /** @type {string} The message content (may be E2E ciphertext). */
      this.content = data.content;
    }
    if ('clientNonce' in data) {
      /** @type {string | null} The client nonce echoed back for optimistic dedupe. */
      this.clientNonce = data.clientNonce ?? null;
    }
    if ('pinned' in data) {
      /** @type {boolean} Whether the message is pinned. */
      this.pinned = Boolean(data.pinned);
    }
    if ('createdAt' in data) {
      /** @type {string} ISO timestamp of when the message was sent. */
      this.createdAt = data.createdAt;
    }
    if ('editedAt' in data) {
      /** @type {string | null} ISO timestamp of the last edit, if edited. */
      this.editedAt = data.editedAt ?? null;
    }
    if (data.author) {
      /** @type {string} Id of the message author. */
      this.authorId = data.author.id;
      // Cache/merge the author as a User.
      this.client.users._add(data.author);
    }
    if (Array.isArray(data.reactions)) {
      /** @type {ReactionGroup[]} Aggregated reactions on this message. */
      this.reactions = data.reactions.map((r) => new ReactionGroup(this.client, this, r));
    } else if (!this.reactions) {
      this.reactions = [];
    }
    return data;
  }

  /** The author of this message, resolved from the user cache. */
  get author() {
    return this.client.users.cache.get(this.authorId) ?? null;
  }

  /** The channel (room or DM) this message belongs to, if cached. */
  get channel() {
    if (this.roomId) return this.client.channels.cache.get(this.roomId) ?? null;
    if (this.dmChannelId) return this.client.dms.cache.get(this.dmChannelId) ?? null;
    return null;
  }

  /** The room this message belongs to, if any and cached. */
  get room() {
    return this.roomId ? (this.client.channels.cache.get(this.roomId) ?? null) : null;
  }

  /** Millisecond timestamp of when the message was created. */
  get createdTimestamp() {
    return this.createdAt ? Date.parse(this.createdAt) : null;
  }

  /** Whether the message was edited. */
  get edited() {
    return this.editedAt != null;
  }

  /**
   * Sends a message to the same channel this message is in.
   * @param {string | import('../managers/MessageManager.js').MessagePayload} content
   * @returns {Promise<Message>}
   */
  reply(content) {
    const target = this.roomId ? { roomId: this.roomId } : { dmChannelId: this.dmChannelId };
    return this.client._sendMessage(target, content);
  }

  /**
   * Edits this message (author only). Emits over the gateway; the updated content
   * is also delivered via `messageUpdate`.
   * @param {string} content
   * @returns {Promise<Message>}
   */
  async edit(content) {
    await this.client.gateway.request('message:edit', { messageId: this.id, content });
    this.content = content;
    this.editedAt = new Date().toISOString();
    return this;
  }

  /**
   * Deletes this message.
   * @returns {Promise<Message>}
   */
  async delete() {
    await this.client.gateway.request('message:delete', { messageId: this.id });
    return this;
  }

  /**
   * Pins this message (room messages only). Requires `ManageMessages`.
   * @returns {Promise<Message>}
   */
  async pin() {
    return this.#setPinned(true);
  }

  /**
   * Unpins this message.
   * @returns {Promise<Message>}
   */
  async unpin() {
    return this.#setPinned(false);
  }

  async #setPinned(pinned) {
    if (!this.roomId) throw new Error('Only room messages can be pinned');
    const { message } = await this.client.rest.post(Routes.roomPin(this.roomId, this.id), {
      pinned,
    });
    this._patch(message);
    return this;
  }

  /**
   * Adds a reaction from the client user.
   * @param {string} emoji
   * @returns {Promise<Message>}
   */
  async react(emoji) {
    await this.client.gateway.request('reaction:toggle', { messageId: this.id, emoji, add: true });
    return this;
  }

  /**
   * Removes the client user's reaction.
   * @param {string} emoji
   * @returns {Promise<Message>}
   */
  async unreact(emoji) {
    await this.client.gateway.request('reaction:toggle', { messageId: this.id, emoji, add: false });
    return this;
  }

  toString() {
    return this.content;
  }
}

export default Message;
