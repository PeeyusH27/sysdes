Design a store that remembers **every value a key has ever had**, together with the time it was written, and can answer "what did this key hold at time `t`?".

Implement the class `TimeMap`:

- `new TimeMap()` creates an empty store.
- `set(key, value, timestamp)` records that `key` was set to `value` at `timestamp`.
- `get(key, timestamp)` returns the value that `key` had at `timestamp`: the one written with the **largest timestamp that is at most** the one asked for. If the key was never written at or before that time, return an empty string `""`.

For any one key, the calls to `set` always use **strictly increasing** timestamps. Different keys are independent.

Each test is a sequence of calls. The first call creates the object. Calls that return nothing are shown as `null` in the expected output, and their return value isn't checked.

### Constraints

- Keys and values are non-empty lowercase strings or short words, at most 100 characters.
- `1 <= timestamp <= 10^7`
- At most `2 * 10^5` calls in total.
