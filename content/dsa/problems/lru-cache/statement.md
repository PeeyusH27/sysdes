Design a cache that holds at most `capacity` key-value pairs and, when it is full, throws out the entry that was **used least recently**. A "use" is either reading the key with `get` or writing it with `put`.

Implement the class `LRUCache`:

- `new LRUCache(capacity)` creates an empty cache that can hold `capacity` entries.
- `get(key)` returns the value stored for `key`, or `-1` if the key is not in the cache. A successful `get` makes the key the most recently used.
- `put(key, value)` stores the value. If the key already exists, its value is replaced and it becomes the most recently used. Otherwise the new entry is added, and if that would exceed `capacity`, the least recently used entry is evicted first.

Both `get` and `put` must run in **O(1)** average time.

Each test is a sequence of calls. The first call creates the object. Calls that return nothing are shown as `null` in the expected output, and their return value isn't checked.

### Constraints

- `1 <= capacity <= 3000`
- `0 <= key <= 10^4` and `0 <= value <= 10^5`
- At most `2 * 10^5` calls in total.
