Build your own hash map from integer keys to integer values. **Do not** use the built-in `Map`, `Set` or plain objects as the map itself; arrays are fine.

Implement the class `MyHashMap`:

- `new MyHashMap()` creates an empty map.
- `put(key, value)` stores the pair. If the key is already present, replace its value.
- `get(key)` returns the value stored for `key`, or `-1` if the key is not in the map.
- `remove(key)` removes the key and its value if present, and does nothing otherwise.

Each test is a sequence of calls. The first call creates the object. Calls that return nothing are shown as `null` in the expected output, and their return value isn't checked.

### Constraints

- `0 <= key, value <= 10^6`
- At most `10^4` calls in total.
