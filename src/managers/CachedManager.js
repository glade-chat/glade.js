'use strict';

import { Collection } from '../util/Collection.js';
import { resolveId } from '../util/Util.js';

/**
 * Base class for all managers. Holds a {@link Collection} cache of structures and
 * provides shared add/resolve helpers. Subclasses set {@link CachedManager#holds}
 * and may override {@link CachedManager#_create} for structures needing extra
 * constructor context.
 * @abstract
 */
export class CachedManager {
  /**
   * @param {import('../client/Client.js').Client} client
   * @param {Function} holds The structure class this manager caches.
   */
  constructor(client, holds) {
    /**
     * @type {import('../client/Client.js').Client}
     * @readonly
     */
    Object.defineProperty(this, 'client', { value: client });
    /**
     * The structure class this manager holds.
     * @type {Function}
     */
    Object.defineProperty(this, 'holds', { value: holds });
    /**
     * The cache of structures, keyed by id.
     * @type {Collection<string, any>}
     */
    this.cache = new Collection();
  }

  /**
   * Instantiates a new structure from raw data. Override when the structure needs
   * more than `(client, data)`.
   * @param {any} data
   * @returns {any}
   * @protected
   */
  _create(data) {
    return new this.holds(this.client, data);
  }

  /**
   * Adds raw data to the cache, patching an existing entry if present.
   * @param {any} data
   * @param {boolean} [cache=true] Whether to store the result in the cache.
   * @returns {any} The cached/created structure.
   * @protected
   */
  _add(data, cache = true) {
    const id = data.id;
    const existing = id != null ? this.cache.get(id) : undefined;
    if (existing) {
      existing._patch(data);
      return existing;
    }
    const entry = this._create(data);
    if (cache && this.client.options.cache && entry.id != null) {
      this.cache.set(entry.id, entry);
    }
    return entry;
  }

  /**
   * Resolves a value to a cached structure.
   * @param {string | { id: string }} idOrInstance
   * @returns {any | null}
   */
  resolve(idOrInstance) {
    if (idOrInstance instanceof this.holds) return idOrInstance;
    if (typeof idOrInstance === 'string') return this.cache.get(idOrInstance) ?? null;
    if (idOrInstance?.id) return this.cache.get(idOrInstance.id) ?? null;
    return null;
  }

  /**
   * Resolves a value to an id.
   * @param {string | { id: string }} idOrInstance
   * @returns {string}
   */
  resolveId(idOrInstance) {
    return resolveId(idOrInstance);
  }

  /** Iterates the cache values. */
  [Symbol.iterator]() {
    return this.cache.values();
  }
}

export default CachedManager;
