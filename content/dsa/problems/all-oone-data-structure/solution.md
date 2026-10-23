### Intuition

`inc` and `dec` move a count by exactly 1. So a key can only ever shift to the **neighbouring count**. That suggests keeping all keys that share a count together in a **bucket**, with buckets arranged in sorted order by count. A key then moves between adjacent buckets, and the extremes are simply the two ends of the sequence.

Sorted order plus O(1) insertion or removal next to a known position means a **doubly linked list** of buckets. The lowest-count bucket is at one end and the highest at the other, so `getMinKey` and `getMaxKey` just read the ends.

### Step by step

1. Keep a doubly linked list of buckets (count and a set of keys), ordered by count, between sentinel buckets `head` (count 0) and `tail` (count Infinity). Keep a map `where` from key to its bucket.
2. `inc(key)`:
   1. Find the key's bucket; a new key counts as being in the `head` bucket (count 0).
   2. If the next bucket's count is not `count + 1`, insert a new bucket right after the current one.
   3. Move the key into that bucket; if the old bucket is now empty (and not `head`), unlink it.
3. `dec(key)`:
   1. If the count is 1, forget the key. Otherwise find or create the bucket for `count - 1` just before the current one and move the key there.
   2. Remove the key from the old bucket, unlinking it if empty.
4. `getMaxKey` reads any key from `tail.prev`; `getMinKey` reads any key from `head.next`. If those are the sentinels, return `""`.

### Dry run: inc a, inc b, inc b, inc c, inc c, inc c

| after call | list (count: keys) |
|---|---|
| inc a | 1: [a] |
| inc b | 1: [a, b] |
| inc b | 1: [a], 2: [b] |
| inc c | 1: [a, c], 2: [b] |
| inc c | 1: [a], 2: [b, c] |
| inc c | 1: [a], 2: [b], 3: [c] |

`getMinKey()` is `a` (first bucket) and `getMaxKey()` is `c` (last bucket).

### Why it works

The list stays sorted because a key only ever moves to a neighbouring count, and a new bucket is created exactly where that count belongs. Buckets that become empty are removed, so the first and last real buckets always hold the true minimum and maximum. Each operation touches a constant number of nodes and set entries.

### Common mistakes

- Leaving **empty buckets** in the list, so `getMaxKey` reads an empty set.
- Unlinking the old bucket before inserting the new neighbour, which loses your place in the list.
- Treating a key dropping to count 0 as a bucket with count 0 instead of removing it.

### Other ways to solve it

A map of counts with a scan for the max or min is simple but O(n). Two heaps with lazy deletion give O(log n). The linked list of buckets is the O(1) design the problem asks for, and the same idea (group by count, move by one) powers the LFU cache.
