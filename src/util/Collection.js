'use strict';

/**
 * A `Map` with additional utility methods, used throughout glade.js to hold
 * cached structures keyed by their id.
 *
 * @template K, V
 * @extends {Map<K, V>}
 */
export class Collection extends Map {
  /**
   * Obtains the first value(s) in this collection.
   * @param {number} [amount] How many values to return; negative counts from the end.
   * @returns {V | V[] | undefined}
   */
  first(amount) {
    if (amount === undefined) return this.values().next().value;
    if (amount < 0) return this.last(amount * -1);
    amount = Math.min(this.size, amount);
    const iter = this.values();
    return Array.from({ length: amount }, () => iter.next().value);
  }

  /**
   * Obtains the last value(s) in this collection.
   * @param {number} [amount]
   * @returns {V | V[] | undefined}
   */
  last(amount) {
    const arr = [...this.values()];
    if (amount === undefined) return arr[arr.length - 1];
    if (amount < 0) return this.first(amount * -1);
    if (!amount) return [];
    return arr.slice(-amount);
  }

  /**
   * Returns a random value.
   * @returns {V | undefined}
   */
  random() {
    const arr = [...this.values()];
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Searches for a single item where the given function returns a truthy value.
   * @param {(value: V, key: K, collection: this) => boolean} fn
   * @returns {V | undefined}
   */
  find(fn) {
    for (const [key, val] of this) if (fn(val, key, this)) return val;
    return undefined;
  }

  /**
   * Searches for the key of a single item where the given function returns a truthy value.
   * @param {(value: V, key: K, collection: this) => boolean} fn
   * @returns {K | undefined}
   */
  findKey(fn) {
    for (const [key, val] of this) if (fn(val, key, this)) return key;
    return undefined;
  }

  /**
   * Identical to `Array.filter()` but returns a new Collection.
   * @param {(value: V, key: K, collection: this) => boolean} fn
   * @returns {Collection<K, V>}
   */
  filter(fn) {
    const results = new this.constructor[Symbol.species]();
    for (const [key, val] of this) if (fn(val, key, this)) results.set(key, val);
    return results;
  }

  /**
   * Maps each item to something else into an array, like `Array.map()`.
   * @template T
   * @param {(value: V, key: K, collection: this) => T} fn
   * @returns {T[]}
   */
  map(fn) {
    const out = [];
    let i = 0;
    for (const [key, val] of this) out[i++] = fn(val, key, this);
    return out;
  }

  /**
   * Checks if there exists an item that passes a test.
   * @param {(value: V, key: K, collection: this) => boolean} fn
   * @returns {boolean}
   */
  some(fn) {
    for (const [key, val] of this) if (fn(val, key, this)) return true;
    return false;
  }

  /**
   * Checks if all items pass a test.
   * @param {(value: V, key: K, collection: this) => boolean} fn
   * @returns {boolean}
   */
  every(fn) {
    for (const [key, val] of this) if (!fn(val, key, this)) return false;
    return true;
  }

  /**
   * Applies a function to produce a single value, like `Array.reduce()`.
   * @template T
   * @param {(accumulator: T, value: V, key: K, collection: this) => T} fn
   * @param {T} [initial]
   * @returns {T}
   */
  reduce(fn, initial) {
    let accumulator = initial;
    let first = accumulator === undefined;
    for (const [key, val] of this) {
      if (first) {
        accumulator = val;
        first = false;
        continue;
      }
      accumulator = fn(accumulator, val, key, this);
    }
    if (first) throw new TypeError('Reduce of empty collection with no initial value');
    return accumulator;
  }

  /**
   * Identical to `Map.forEach()` but returns the collection for chaining.
   * @param {(value: V, key: K, collection: this) => void} fn
   * @returns {this}
   */
  each(fn) {
    for (const [key, val] of this) fn(val, key, this);
    return this;
  }

  /**
   * Returns the items that pass the test as an array.
   * @returns {V[]}
   */
  toArray() {
    return [...this.values()];
  }

  /**
   * Returns the keys as an array.
   * @returns {K[]}
   */
  keyArray() {
    return [...this.keys()];
  }

  /**
   * Creates an identical shallow copy of this collection.
   * @returns {Collection<K, V>}
   */
  clone() {
    return new this.constructor[Symbol.species](this);
  }
}

export default Collection;
