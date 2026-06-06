'use strict';

/**
 * The base class every cached Glade structure extends. Holds a non-enumerable
 * reference to the owning {@link Client} so structures can perform actions.
 * @abstract
 */
export class Base {
  /**
   * @param {import('../client/Client.js').Client} client
   */
  constructor(client) {
    /**
     * The client that instantiated this structure.
     * @type {import('../client/Client.js').Client}
     * @readonly
     */
    Object.defineProperty(this, 'client', { value: client });
  }

  /**
   * Applies raw API data onto this structure. Subclasses override and call super.
   * @param {any} data
   * @returns {any} The same data, for convenience.
   * @protected
   */
  _patch(data) {
    return data;
  }

  /**
   * Returns a shallow clone of this structure (used for "old" copies in update events).
   * @returns {this}
   * @protected
   */
  _clone() {
    return Object.assign(Object.create(this), this);
  }

  /**
   * Snapshots this structure (the "old" copy), patches this instance in place with
   * the new data, and returns the old snapshot — handy for `*Update` events.
   * @param {any} data
   * @returns {this} The pre-patch snapshot.
   * @protected
   */
  _update(data) {
    const old = this._clone();
    this._patch(data);
    return old;
  }

  /**
   * @returns {string | undefined}
   */
  valueOf() {
    return this.id;
  }

  toJSON() {
    const out = {};
    for (const [key, value] of Object.entries(this)) {
      if (value && typeof value === 'object' && 'cache' in value) continue; // skip managers
      out[key] = value?.toJSON ? value.toJSON() : value;
    }
    return out;
  }
}

export default Base;
