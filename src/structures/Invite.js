'use strict';

import { Base } from './Base.js';
import { Routes } from '../rest/Routes.js';

/**
 * Represents an invite to a House. Depending on where it came from, some fields
 * may be absent (e.g. a previewed invite has no `id`, so it cannot be revoked).
 * @extends {Base}
 */
export class Invite extends Base {
  constructor(client, data) {
    super(client);
    this._patch(data);
  }

  _patch(data) {
    if ('id' in data) {
      /** @type {string | undefined} The invite id (present when listed/created). */
      this.id = data.id;
    }
    if ('code' in data) {
      /** @type {string} The invite code. */
      this.code = data.code;
    }
    if ('uses' in data) {
      /** @type {number | undefined} How many times the invite has been used. */
      this.uses = data.uses;
    }
    if ('maxUses' in data) {
      /** @type {number | null | undefined} Maximum uses, or null for unlimited. */
      this.maxUses = data.maxUses ?? null;
    }
    if ('expiresAt' in data) {
      /** @type {string | null} ISO expiry timestamp, or null if it never expires. */
      this.expiresAt = data.expiresAt ?? null;
    }
    if ('createdAt' in data) {
      /** @type {string | undefined} ISO creation timestamp. */
      this.createdAt = data.createdAt;
    }
    if (data.house) {
      /** @type {{ id: string, name: string, iconUrl: string | null, accent: string | null } | undefined} Partial House info from a preview. */
      this.house = data.house;
      this.houseId = data.house.id;
    }
    // From listing: `creator { handle, displayName }`. From preview: `inviter { handle, displayName }`.
    if (data.creator || data.inviter) {
      /** @type {{ handle: string, displayName: string }} The user who created the invite. */
      this.inviter = data.creator ?? data.inviter;
    }
    return data;
  }

  /** Whether the invite has expired (based on `expiresAt`). */
  get expired() {
    return this.expiresAt ? Date.parse(this.expiresAt) < Date.now() : false;
  }

  /**
   * Redeems this invite for the logged-in account, joining the House.
   * @returns {Promise<import('./House.js').House>}
   */
  redeem() {
    return this.client.redeemInvite(this.code);
  }

  /**
   * Revokes (deletes) this invite. Requires the invite `id` (present on listed or
   * freshly-created invites).
   * @returns {Promise<void>}
   */
  async delete() {
    if (!this.id) throw new Error('This invite has no id and cannot be revoked');
    await this.client.rest.delete(Routes.inviteRevoke(this.id));
  }

  toString() {
    return this.code;
  }
}

export default Invite;
