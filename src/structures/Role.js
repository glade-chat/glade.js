'use strict';

import { Base } from './Base.js';
import { Routes } from '../rest/Routes.js';
import { PermissionsBitField } from '../util/Permissions.js';

/**
 * Represents a role in a House.
 * @extends {Base}
 */
export class Role extends Base {
  constructor(client, data) {
    super(client);
    /** @type {string} The role id. */
    this.id = data.id;
    this._patch(data);
  }

  _patch(data) {
    if ('houseId' in data) {
      /** @type {string} Id of the House this role belongs to. */
      this.houseId = data.houseId;
    }
    if ('name' in data) {
      /** @type {string} The role name. */
      this.name = data.name;
    }
    if ('color' in data) {
      /** @type {string | null} The role color. */
      this.color = data.color ?? null;
    }
    if ('permissions' in data) {
      /** @type {PermissionsBitField} The role's permission bitfield. */
      this.permissions = new PermissionsBitField(data.permissions ?? 0);
    }
    if ('position' in data) {
      /** @type {number} The role's sort position. */
      this.position = data.position ?? 0;
    }
    if ('isDefault' in data) {
      /** @type {boolean} Whether this is the `@everyone` role. */
      this.isDefault = Boolean(data.isDefault);
    }
    if ('hoist' in data) {
      /** @type {boolean} Whether members with this role show in their own list section. */
      this.hoist = Boolean(data.hoist);
    }
    return data;
  }

  /** The House this role belongs to, if cached. */
  get house() {
    return this.client.houses.cache.get(this.houseId) ?? null;
  }

  /**
   * Edits this role.
   * @param {{ name?: string, color?: string | null, permissions?: import('../util/Permissions.js').PermissionResolvable, hoist?: boolean }} data
   * @returns {Promise<Role>}
   */
  async edit(data) {
    const body = { ...data };
    if (data.permissions !== undefined) body.permissions = PermissionsBitField.resolve(data.permissions);
    const { role } = await this.client.rest.patch(Routes.role(this.id), body);
    this._patch(role);
    return this;
  }

  /** Sets the role name. */
  setName(name) {
    return this.edit({ name });
  }

  /** Sets the role color. */
  setColor(color) {
    return this.edit({ color });
  }

  /**
   * Sets the role's permissions.
   * @param {import('../util/Permissions.js').PermissionResolvable} permissions
   * @returns {Promise<Role>}
   */
  setPermissions(permissions) {
    return this.edit({ permissions });
  }

  /** Sets whether the role is hoisted. */
  setHoist(hoist) {
    return this.edit({ hoist });
  }

  /**
   * Deletes this role.
   * @returns {Promise<void>}
   */
  async delete() {
    await this.client.rest.delete(Routes.role(this.id));
    this.house?.roles.cache.delete(this.id);
  }

  toString() {
    return this.name;
  }
}

export default Role;
