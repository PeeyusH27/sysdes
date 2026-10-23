class EvictionCache {
  /** @param {number} capacity at least 1  @param {"lru"|"fifo"|"lfu"} policy */
  constructor(capacity, policy) {
    
  }

  /** @return {number} the value, or -1 if absent. A hit counts as a use. */
  get(key) {
    
  }

  /** Store or replace a value. @return {string} the evicted key, or "" if nothing was evicted */
  put(key, value) {
    
  }

  /** Like get, but not a use. @return {number} the value, or -1 */
  peek(key) {
    
  }

  /** @return {boolean} true if the key existed */
  remove(key) {
    
  }

  /** @return {string[]} every key in eviction order: the next victim first */
  keys() {
    
  }

  /** Change the capacity. @return {string[]} the keys evicted to fit, in the order they were evicted */
  resize(capacity) {
    
  }
}
