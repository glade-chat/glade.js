'use strict';

/**
 * Glade House permission flags. These mirror the bitfield stored in
 * `Role.permissions` and the allow/deny masks on per-room overrides server-side.
 * @enum {number}
 */
export const PermissionFlags = {
  /** Grants every permission and bypasses channel overrides. */
  Administrator: 1 << 0,
  /** Edit the House name / icon. */
  ManageHouse: 1 << 1,
  /** Create, edit, delete and assign roles. */
  ManageRoles: 1 << 2,
  /** Create, edit, delete and clone rooms, and set channel overrides. */
  ManageChannels: 1 << 3,
  /** Remove members from the House. */
  KickMembers: 1 << 4,
  /** Pin and delete other members' messages. */
  ManageMessages: 1 << 5,
  /** View rooms. */
  ViewChannels: 1 << 6,
  /** Send messages in rooms. */
  SendMessages: 1 << 7,
  /** Connect to voice rooms. */
  Connect: 1 << 8,
};

/** Every permission OR'd together. */
export const ALL_PERMISSIONS = Object.values(PermissionFlags).reduce((a, b) => a | b, 0);

/** Permissions granted to the default `@everyone` role by the backend. */
export const DEFAULT_EVERYONE =
  PermissionFlags.ViewChannels | PermissionFlags.SendMessages | PermissionFlags.Connect;

/** Permissions a per-room override is allowed to toggle. */
export const CHANNEL_OVERRIDABLE =
  PermissionFlags.ViewChannels |
  PermissionFlags.SendMessages |
  PermissionFlags.Connect |
  PermissionFlags.ManageMessages;

/**
 * A wrapper around a Glade permission bitfield, offering ergonomic checks and edits.
 * Accepts flag names (keys of {@link PermissionFlags}), raw numbers, or other
 * `PermissionsBitField` instances anywhere a resolvable is expected.
 */
export class PermissionsBitField {
  /**
   * @param {PermissionResolvable} [bits=0]
   */
  constructor(bits = 0) {
    /** @type {number} The raw bitfield. */
    this.bitfield = PermissionsBitField.resolve(bits);
  }

  /**
   * Resolves a permission-like value into a raw number.
   * @param {PermissionResolvable} bits
   * @returns {number}
   */
  static resolve(bits = 0) {
    if (typeof bits === 'number') return bits;
    if (bits instanceof PermissionsBitField) return bits.bitfield;
    if (typeof bits === 'string') {
      const flag = PermissionFlags[bits];
      if (flag === undefined) throw new RangeError(`Unknown permission flag: ${bits}`);
      return flag;
    }
    if (Array.isArray(bits)) {
      return bits.map((b) => PermissionsBitField.resolve(b)).reduce((a, b) => a | b, 0);
    }
    throw new TypeError(`Cannot resolve permissions from: ${typeof bits}`);
  }

  /**
   * Whether the bitfield holds all of the given permissions. The `Administrator`
   * flag short-circuits to `true`, matching the server's `has()` semantics.
   * @param {PermissionResolvable} permission
   * @param {boolean} [checkAdmin=true]
   * @returns {boolean}
   */
  has(permission, checkAdmin = true) {
    if (checkAdmin && (this.bitfield & PermissionFlags.Administrator) !== 0) return true;
    const bit = PermissionsBitField.resolve(permission);
    return (this.bitfield & bit) === bit;
  }

  /**
   * Returns whether any of the given permission bits are present.
   * @param {PermissionResolvable} permission
   * @returns {boolean}
   */
  any(permission) {
    const bit = PermissionsBitField.resolve(permission);
    return (this.bitfield & bit) !== 0;
  }

  /**
   * Adds permissions, returning this for chaining.
   * @param {...PermissionResolvable} bits
   * @returns {this}
   */
  add(...bits) {
    for (const b of bits) this.bitfield |= PermissionsBitField.resolve(b);
    return this;
  }

  /**
   * Removes permissions, returning this for chaining.
   * @param {...PermissionResolvable} bits
   * @returns {this}
   */
  remove(...bits) {
    for (const b of bits) this.bitfield &= ~PermissionsBitField.resolve(b);
    return this;
  }

  /**
   * The flag names currently set in this bitfield.
   * @returns {string[]}
   */
  toArray() {
    return Object.keys(PermissionFlags).filter(
      (name) => (this.bitfield & PermissionFlags[name]) === PermissionFlags[name],
    );
  }

  /** @returns {number} */
  valueOf() {
    return this.bitfield;
  }

  /** @returns {string[]} */
  toJSON() {
    return this.toArray();
  }
}

PermissionsBitField.Flags = PermissionFlags;
PermissionsBitField.All = ALL_PERMISSIONS;
PermissionsBitField.DefaultEveryone = DEFAULT_EVERYONE;

/**
 * @typedef {keyof typeof PermissionFlags | number | PermissionsBitField | Array<keyof typeof PermissionFlags | number | PermissionsBitField>} PermissionResolvable
 */

export default PermissionsBitField;
