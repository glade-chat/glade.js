'use strict';

import { CachedManager } from './CachedManager.js';
import { Role } from '../structures/Role.js';
import { Routes } from '../rest/Routes.js';
import { PermissionsBitField } from '../util/Permissions.js';

/**
 * Manages the roles of a single House.
 * @extends {CachedManager}
 */
export class RoleManager extends CachedManager {
  /**
   * @param {import('../client/Client.js').Client} client
   * @param {import('../structures/House.js').House} house
   */
  constructor(client, house) {
    super(client, Role);
    /** @type {import('../structures/House.js').House} */
    Object.defineProperty(this, 'house', { value: house });
  }

  /** The default `@everyone` role, if cached. */
  get everyone() {
    return this.cache.find((r) => r.isDefault) ?? null;
  }

  /**
   * Fetches all roles in this House.
   * @returns {Promise<import('../util/Collection.js').Collection<string, Role>>}
   */
  async fetch() {
    const { roles } = await this.client.rest.get(Routes.houseRoles(this.house.id));
    for (const role of roles) this._add(role);
    return this.cache;
  }

  /**
   * Creates a role. Requires `ManageRoles`.
   * @param {{ name: string, color?: string | null, permissions?: import('../util/Permissions.js').PermissionResolvable }} data
   * @returns {Promise<Role>}
   */
  async create({ name, color, permissions } = {}) {
    const body = { name, color };
    if (permissions !== undefined) body.permissions = PermissionsBitField.resolve(permissions);
    const { role } = await this.client.rest.post(Routes.houseRoles(this.house.id), body);
    return this._add(role);
  }

  /**
   * Reorders the House's roles.
   * @param {Array<string | Role>} orderedIds
   * @returns {Promise<import('../util/Collection.js').Collection<string, Role>>}
   */
  async reorder(orderedIds) {
    const ids = orderedIds.map((r) => this.resolveId(r));
    const { roles } = await this.client.rest.post(Routes.houseRolesReorder(this.house.id), {
      orderedIds: ids,
    });
    for (const role of roles) this._add(role);
    return this.cache;
  }
}

export default RoleManager;
