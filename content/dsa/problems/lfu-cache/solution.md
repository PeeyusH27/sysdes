### Intuition

LRU needs one ordering (by recency). LFU needs **two**: first by use count, then by recency inside each count. Sorting all keys by `(count, last use)` would make eviction O(log n); we need O(1).

The trick is that a use only ever changes a key's count by **exactly +1**. So group the keys into buckets by count. A hit moves a key from bucket `c` to bucket `c + 1`, never farther. Inside each bucket, keep keys in the order they arrived there: the oldest sits at the front, which is exactly the tie-break we need.

Eviction then needs only the **lowest non-empty count**, which we track in `minCount`.

### Step by step

1. Keep `values` (key to value), `counts` (key to use count), `buckets` (count to an insertion-ordered set of keys) and `minCount`.
2. `touch(key)`: remove the key from bucket `c`; if that bucket is now empty, delete it and, when `c` was `minCount`, set `minCount = c + 1`. Add the key to bucket `c + 1` and record the new count.
3. `get(key)`: if absent return `-1`; otherwise `touch(key)` and return the value.
4. `put(key, value)`:
   1. If `capacity` is 0, do nothing.
   2. If the key exists, update its value and `touch` it.
   3. Otherwise, if the cache is full, take the first key of bucket `minCount` and remove it everywhere.
   4. Insert the new key with count 1, put it in bucket 1 and set `minCount = 1`.

### Dry run: capacity 2, put 1, put 2, get 1, put 3

| call | buckets (count: keys) | minCount | note |
|---|---|---|---|
| put(1, 1) | 1: [1] | 1 | |
| put(2, 2) | 1: [1, 2] | 1 | |
| get(1) | 1: [2], 2: [1] | 1 | key 1 moves up |
| put(3, 3) | full: evict first of bucket 1 (key 2) | 1 | |
| after insert | 1: [3], 2: [1] | 1 | new key resets minCount to 1 |

### Why it works

`minCount` is always the smallest count present. It only changes in two places: a new key makes it 1 (nothing can be lower), and a hit that empties the lowest bucket makes it `c + 1`, because the hit key itself just landed there. It never needs a search. Each operation touches a constant number of maps and sets.

### Common mistakes

- Evicting by the lowest count only, and forgetting the **recency tie-break**.
- Updating `minCount` wrongly after `touch`: if the bucket that empties is not `minCount`, leave it alone.
- Treating `put` on an existing key as free. It is a use, so it must bump the count.
- Not handling `capacity = 0`, where there is nothing to evict and nothing to store.

### Other ways to solve it

A heap ordered by `(count, time)` is easy to write but costs O(log n) per call, and stale heap entries need lazy deletion. The bucket idea above is the O(1) answer interviewers are after. A doubly linked list of count-nodes (like the All O(1) problem) removes the need for `minCount` altogether.
