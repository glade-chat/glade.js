'use strict';

import { Base } from './Base.js';
import { Routes } from '../rest/Routes.js';
import { Collection } from '../util/Collection.js';
import { PermissionsBitField, ALL_PERMISSIONS, PermissionFlags } from '../util/Permissions.js';
import { resolveId } from '../util/Util.js';

/**
 * Represents a member of a House — a user plus their House-specific data (roles,
 * nickname, presence). The member id equals the underlying user id.
 * @extends {Base}
 */
export class Member extends Base {
  /**
   * @param {import('../client/Client.js').Client} client
   * @param {import('./House.js').House} house
   * @param {any} data
   */
  constructor(client, house, data) {
    super(client);
    /** @type {string} The member (and user) id. */
    this.id = data.id;
    /** @type {string} Id of the House this membership belongs to. */
    this.houseId = house.id;
    this._patch(data);
  }

  _patch(data) {
    // Keep the underlying user in the global cache fresh.
    if ('handle' in data || 'displayName' in data) this.client.users._add(data);
    if ('nickname' in data) {
      /**
       * The member's House nickname, if any.
       * @type {string | null}
       * @remarks The current backend members endpoint does not serialize nicknames,
       * so this is typically `null`; {@link Member#displayName} falls back to the user's.
       */
      this.nickname = data.nickname ?? null;
    } else if (this.nickname === undefined) {
      this.nickname = null;
    }
    if ('roleIds' in data) {
      /** @type {string[]} Ids of the roles assigned to this member. */
      this.roleIds = data.roleIds ?? [];
    } else if (!this.roleIds) {
      this.roleIds = [];
    }
    if ('status' in data) {
      /** @type {string} The member's current presence status. */
      this.status = data.status ?? 'offline';
    }
    return data;
  }

  /** The underlying {@link User}, from the user cache. */
  get user() {
    return this.client.users.cache.get(this.id) ?? null;
  }

  /** The House this member belongs to, if cached. */
  get house() {
    return this.client.houses.cache.get(this.houseId) ?? null;
  }

  /** The member's effective display name (nickname falls back to the user's). */
  get displayName() {
    return this.nickname ?? this.user?.displayName ?? null;
  }

  /** Whether this member owns the House. */
  get isOwner() {
    return this.house?.ownerId === this.id;
  }

  /**
   * The roles assigned to this member (including `@everyone`), resolved from the
   * House role cache.
   * @returns {Collection<string, import('./Role.js').Role>}
   */
  get roles() {
    const collection = new Collection();
    const house = this.house;
    if (!house) return collection;
    const everyone = house.roles.cache.find((r) => r.isDefault);
    if (everyone) collection.set(everyone.id, everyone);
    for (const id of this.roleIds) {
      const role = house.roles.cache.get(id);
      if (role) collection.set(role.id, role);
    }
    return collection;
  }

  /**
   * The member's computed House-wide permissions. Requires the House's roles to be
   * cached for non-owners; owners and Administrators resolve to all permissions.
   * @returns {PermissionsBitField}
   */
  get permissions() {
    if (this.isOwner) return new PermissionsBitField(ALL_PERMISSIONS);
    let bits = 0;
    for (const role of this.roles.values()) bits |= role.permissions.bitfield;
    if (bits & PermissionFlags.Administrator) bits = ALL_PERMISSIONS;
    return new PermissionsBitField(bits);
  }

  /**
   * Replaces this member's (non-default) roles. Requires `ManageRoles`.
   * @param {Array<string | import('./Role.js').Role>} roles
   * @returns {Promise<Member>}
   */
  async setRoles(roles) {
    const roleIds = roles.map(resolveId);
    const result = await this.client.rest.put(
      Routes.memberRoles(this.houseId, this.id),
      { roleIds },
    );
    this.roleIds = result.roleIds ?? roleIds;
    return this;
  }

  /**
   * Adds one or more roles to this member.
   * @param {...(string | import('./Role.js').Role)} roles
   * @returns {Promise<Member>}
   */
  addRole(...roles) {
    const next = new Set(this.roleIds);
    for (const role of roles) next.add(resolveId(role));
    return this.setRoles([...next]);
  }

  /**
   * Removes one or more roles from this member.
   * @param {...(string | import('./Role.js').Role)} roles
   * @returns {Promise<Member>}
   */
  removeRole(...roles) {
    const remove = new Set(roles.map(resolveId));
    return this.setRoles(this.roleIds.filter((id) => !remove.has(id)));
  }

  toString() {
    return this.displayName ?? this.id;
  }
}

export default Member;
