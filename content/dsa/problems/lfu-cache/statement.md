Design a cache that holds at most `capacity` key-value pairs and, when it is full, evicts the entry that was **used the fewest times**. If several entries are tied for the fewest uses, evict the one that was **used least recently** among them.

Implement the class `LFUCache`:

- `new LFUCache(capacity)` creates an empty cache.
- `get(key)` returns the value stored for `key`, or `-1` if it is absent. A successful `get` counts as one use.
- `put(key, value)` stores the value. If the key exists, its value is replaced and that counts as one use. If it is new and the cache is full, evict first as described above. A new key starts with a use count of 1.

When an entry is evicted its count is forgotten: if the key comes back later it starts again at 1. A cache with capacity `0` stores nothing. Both `get` and `put` must run in **O(1)** average time.

Each test is a sequence of calls. The first call creates the object. Calls that return nothing are shown as `null` in the expected output, and their return value isn't checked.

### Constraints

- `0 <= capacity <= 10^4`
- `0 <= key <= 10^5` and `0 <= value <= 10^9`
- At most `2 * 10^5` calls in total.
