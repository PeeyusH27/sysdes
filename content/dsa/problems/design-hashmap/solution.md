### Intuition

An array lookup by index is O(1). If keys were small, you could use the key itself as the index. Here a key can reach 10^6, so one slot per possible key would waste memory. The fix is a **hash function**: squeeze the key into a small range, here `key % size`, and use that as the index of a **bucket**.

Squeezing means two different keys can land in the same bucket (a *collision*). The simplest answer is **separate chaining**: each bucket is a small list of `[key, value]` pairs, and you scan only that list. With a reasonable number of buckets the lists stay short, so every call is O(1) on average.

### Step by step

1. Create `size` buckets (an array of empty arrays). A prime such as 1009 spreads keys well.
2. `bucketOf(key)` returns `buckets[key % size]`.
3. `put(key, value)`: scan the bucket; if a pair has this key, overwrite its value and stop. Otherwise push a new pair.
4. `get(key)`: scan the bucket; return the value of the matching pair, or `-1`.
5. `remove(key)`: find the pair's index in the bucket and splice it out if found.

### Dry run: put(1, 10), put(1010, 20), get(1010), remove(1)

With 1009 buckets, 1 % 1009 = 1 and 1010 % 1009 = 1: the same bucket.

| call | bucket 1 after | returns |
|---|---|---|
| put(1, 10) | [[1, 10]] | |
| put(1010, 20) | [[1, 10], [1010, 20]] | |
| get(1010) | unchanged: skip key 1, match key 1010 | 20 |
| remove(1) | [[1010, 20]] | |

### Edge cases

- A stored value of `0` is a real value; a missing key is `-1`. Compare keys, never test values for truthiness.
- `put` on an existing key must replace, not append a second pair.
- Keys that collide must not disturb each other on `remove`.

### Common mistakes

- Appending in `put` without checking for an existing key, so `get` later returns the stale value.
- A tiny bucket count, which turns every call into a long scan. Pick a size related to the number of expected keys.
- Using `key / size` instead of `key % size` (a fractional index).

### Other ways to solve it

For keys up to 10^6 you could use one array of 10^6 + 1 slots filled with -1: O(1) worst case, but 1 million slots for a handful of keys. Open addressing (probing the next slots on a collision) avoids per-bucket arrays but makes removal trickier because it needs tombstones.
