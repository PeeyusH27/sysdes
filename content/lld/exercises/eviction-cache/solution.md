This is Strategy wrapped around a hash map. The cache stores values; a policy decides only the order. Keeping those two jobs apart is what lets a new policy arrive without touching the cache.

1. **Split data from order.** `EvictionCache` owns `values` (key → value) and nothing about recency. A policy owns the order and never sees a value. Neither can corrupt the other.
2. **Give every policy the same four calls.** `insert(key)`, `use(key)`, `forget(key)` and `ranked()` (keys, next victim first). That is the whole contract, and it is small enough that the three policies are a few lines each.
3. **Let the data structure carry the rule.** An insertion-ordered map makes LRU trivial: a use is delete-then-set, which moves the key to the back. FIFO is the same map where `use` does nothing. LFU needs a count and a last-use stamp per key, and its ranking is a sort on `(count, last)`.
4. **Evict before you insert, and only for a new key.** `put` of a known key replaces the value and counts as a use. It never evicts, so a full cache is not a problem. A new key on a full cache asks for `ranked()[0]`, deletes it from both the values and the policy, and returns it.
5. **Forget completely.** `remove` and every eviction call `forget`. If LFU kept a removed key's count, a returning key would wrongly look popular, and the test for it fails.
6. **Look the policy up by name.** A `POLICIES` table maps `"lru"` to a class. A fourth policy is one new class and one new line in the table, and no existing line changes. The tests cannot see this, but a reviewer reading an `if` ladder inside `put` can.
7. **Reuse the eviction path.** `resize` is the same `evictOne` in a loop, so the order of evictions follows the policy by construction.

Where the design bends: a policy that needs more than the key (an expiry time, a weight in bytes) would make `insert` and `use` take an entry object, and `put` would loop until the new weight fits. Thread safety wraps the whole cache in one lock, because `get` calls `use`, which reorders.

Cost: LRU and FIFO are O(1) per call. This reference LFU sorts on every eviction, which is O(n log n) and is fine for a few thousand keys. The production version keeps a bucket of keys per count and a pointer to the lowest non-empty bucket, which makes every call O(1).
