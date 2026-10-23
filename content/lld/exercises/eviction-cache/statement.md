Build a fixed-size **cache** whose eviction rule can be chosen by name. When the cache is full and a new key arrives, one existing key must go, and *which one* is the policy. The cache itself must not contain an `if (policy === ...)` ladder, and adding a fourth policy later must not mean editing the three that already work. This is the Strategy pattern, wrapped around a hash map.

Implement the class `EvictionCache`:

- `EvictionCache(capacity, policy)`: an empty cache holding at most `capacity` keys (always at least 1). `policy` is `"lru"`, `"fifo"` or `"lfu"`.
- `get(key)`: returns the value, or `-1` if the key is absent. A hit counts as a **use** of the key.
- `put(key, value)`: stores a value (a non-negative integer) and returns the key that was **evicted** to make room, or `""` if nothing was evicted. A new key on a full cache evicts first, then inserts. Putting a key that is already present replaces its value, counts as a use, evicts nothing and returns `""`.
- `peek(key)`: like `get`, but it is **not** a use: it never changes who will be evicted.
- `remove(key)`: deletes the key and returns `true`, or returns `false` if it was absent. Everything the cache knew about that key is forgotten, so putting it again later starts from scratch.
- `keys()`: every key in **eviction order**: the first key is the next victim, the last is the safest.
- `resize(capacity)`: changes the capacity and returns the list of keys evicted to fit, in the order they were evicted (the next victim each time). Growing evicts nothing and returns `[]`.

**The three policies**

- `"lru"` (least recently used): the victim is the key whose last use is oldest. Inserting is a use.
- `"fifo"` (first in, first out): the victim is the key that was inserted longest ago. Reads and replacements do **not** change the order.
- `"lfu"` (least frequently used): every key has a count of uses. Inserting sets it to 1, and each hit or replacement adds 1. The victim is the key with the **lowest count**; if several tie, the one whose last use is oldest.

**Notes**

- Evicting, removing and resizing all count as forgetting a key. A key that comes back starts as new: at the back of the FIFO order, as the most recent in LRU, and with a count of 1 in LFU.
- `keys()` is sorted the way the policy would evict: for LFU that is ascending count, then oldest last use.
- Return values must be exactly the types above: a number, a string, a boolean or an array.
