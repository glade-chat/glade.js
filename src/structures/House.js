'use strict';

import { Base } from './Base.js';
import { Routes } from '../rest/Routes.js';
import { RoomManager } from '../managers/RoomManager.js';
import { MemberManager } from '../managers/MemberManager.js';
import { RoleManager } from '../managers/RoleManager.js';
import { InviteManager } from '../managers/InviteManager.js';

/**
 * Represents a Glade House — a community, analogous to a server/guild. Holds the
 * House's rooms, members, roles, and invites.
 * @extends {Base}
 */
export class House extends Base {
  constructor(client, data) {
    super(client);
    /** @type {string} The House id. */
    this.id = data.id;

    /** @type {RoomManager} Manager for the House's rooms (channels). */
    this.rooms = new RoomManager(client, this);
    /** @type {MemberManager} Manager for the House's members. */
    this.members = new MemberManager(client, this);
    /** @type {RoleManager} Manager for the House's roles. */
    this.roles = new RoleManager(client, this);
    /** @type {InviteManager} Manager for the House's invites. */
    this.invites = new InviteManager(client, this);

    this._patch(data);
  }

  _patch(data) {
    if ('name' in data) {
      /** @type {string} The House name. */
      this.name = data.name;
    }
    if ('iconUrl' in data) {
      /** @type {string | null} URL of the House icon. */
      this.iconUrl = data.iconUrl ?? null;
    }
    if ('accent' in data) {
      /** @type {string | null} The House accent color. */
      this.accent = data.accent ?? null;
    }
    if ('ownerId' in data) {
      /** @type {string} Id of the House owner. */
      this.ownerId = data.ownerId;
    }
    if ('createdAt' in data) {
      /** @type {string | null} ISO creation timestamp. */
      this.createdAt = data.createdAt ?? null;
    }
    if (Array.isArray(data.rooms)) {
      for (const room of data.rooms) this.rooms._add(room);
    }
    return data;
  }

  /** The owner of this House, if cached. */
  get owner() {
    return this.client.users.cache.get(this.ownerId) ?? null;
  }

  /** Whether the logged-in account owns this House. */
  get isOwner() {
    return this.client.user?.id === this.ownerId;
  }

  /**
   * Edits this House.
   * @param {{ name?: string, iconUrl?: string | null }} data
   * @returns {Promise<House>}
   */
  async edit(data) {
    const { house } = await this.client.rest.patch(Routes.house(this.id), data);
    this._patch(house);
    return this;
  }

  /** Sets the House name. */
  setName(name) {
    return this.edit({ name });
  }

  /** Sets the House icon URL (or null to clear). */
  setIcon(iconUrl) {
    return this.edit({ iconUrl });
  }

  /**
   * Permanently deletes this House. Owner only.
   * @returns {Promise<void>}
   */
  async delete() {
    await this.client.rest.delete(Routes.house(this.id));
    this.client.houses.cache.delete(this.id);
  }

  /**
   * Leaves this House.
   * @returns {Promise<void>}
   */
  async leave() {
    await this.client.rest.post(Routes.houseLeave(this.id));
    this.client.houses.cache.delete(this.id);
  }

  /**
   * Creates a room (channel) in this House.
   * @param {string} name
   * @param {{ type?: 'text' | 'voice' | 'portal' }} [options]
   * @returns {Promise<import('./Room.js').Room>}
   */
  createRoom(name, options = {}) {
    return this.rooms.create(name, options);
  }

  /**
   * Creates a role in this House.
   * @param {object} data
   * @returns {Promise<import('./Role.js').Role>}
   */
  createRole(data) {
    return this.roles.create(data);
  }

  /**
   * Creates an invite to this House.
   * @param {{ expiresInMinutes?: number | null, maxUses?: number | null }} [options]
   * @returns {Promise<import('./Invite.js').Invite>}
   */
  createInvite(options = {}) {
    return this.invites.create(options);
  }

  /** Fetches and caches all members. */
  fetchMembers() {
    return this.members.fetch();
  }

  /** Fetches and caches all rooms. */
  fetchRooms() {
    return this.rooms.fetch();
  }

  /** Fetches and caches all roles. */
  fetchRoles() {
    return this.roles.fetch();
  }

  /** Fetches all active invites for this House. */
  fetchInvites() {
    return this.invites.fetch();
  }

  /**
   * Fetches current voice-room occupancy for this House over the gateway.
   * @returns {Promise<Array<{ roomId: string, users: Array<{ userId: string, muted: boolean, deafened: boolean }> }>>}
   */
  async fetchVoiceStates() {
    const ack = await this.client.gateway.request('voice:sync', this.id);
    return ack?.states ?? [];
  }

  toString() {
    return this.name;
  }
}

export default House;
