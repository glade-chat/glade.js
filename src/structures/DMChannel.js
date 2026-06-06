'use strict';

import { Base } from './Base.js';
import { MessageManager } from '../managers/MessageManager.js';

/**
 * Represents a direct-message channel between the client user and one or more
 * other users.
 * @extends {Base}
 */
export class DMChannel extends Base {
  constructor(client, data) {
    super(client);
    /** @type {string} The DM channel id. */
    this.id = data.id;
    /** @type {MessageManager} Cache + helpers for this channel's messages. */
    this.messages = new MessageManager(client, this);
    /** @type {string[]} Ids of the other participants. */
    this.participantIds = [];
    this._patch(data);
  }

  _patch(data) {
    if (Array.isArray(data.participants)) {
      this.participantIds = data.participants.map((p) => {
        this.client.users._add(p);
        return p.id;
      });
    }
    return data;
  }

  /** The other participants in this DM, resolved from the user cache. */
  get participants() {
    return this.participantIds
      .map((id) => this.client.users.cache.get(id))
      .filter((u) => Boolean(u));
  }

  /** The primary recipient (first other participant). */
  get recipient() {
    return this.participants[0] ?? null;
  }

  /** This DM channel is always a DM (not a room). */
  isDM() {
    return true;
  }

  /**
   * Sends a message to this DM channel.
   * @param {string | import('../managers/MessageManager.js').MessagePayload} content
   * @returns {Promise<import('./Message.js').Message>}
   */
  send(content) {
    return this.client._sendMessage({ dmChannelId: this.id }, content);
  }

  /** Broadcasts a "typing…" indicator to the DM. */
  sendTyping() {
    this.client.gateway.send('typing:start', { dmChannelId: this.id });
    return this;
  }

  /** Stops the "typing…" indicator. */
  stopTyping() {
    this.client.gateway.send('typing:stop', { dmChannelId: this.id });
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

  toString() {
    return this.recipient ? this.recipient.toString() : this.id;
  }
}

export default DMChannel;
