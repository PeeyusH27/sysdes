### Intuition

A single map from key to latest value is not enough, because `get` may ask about the **past**. So keep each key's whole history. Since timestamps for one key only grow, the history is automatically **sorted by time**, and a sorted list begs for a binary search.

"The value with the largest timestamp that is at most `t`" is the classic *last position that still satisfies a condition* search, the same boundary search used for upper bounds.

### Step by step

1. Keep a `Map` from key to an array of `[timestamp, value]` pairs.
2. `set`: append `[timestamp, value]` to that key's array (create it first if needed). The array stays sorted for free.
3. `get`: look up the key's array. If there is none, return `""`.
4. Binary search for `lo`, the first index whose timestamp is greater than the query.
   1. `lo` starts at 0 and `hi` at the array length.
   2. If `list[mid][0] <= timestamp`, the answer is at `mid` or later, so `lo = mid + 1`; otherwise `hi = mid`.
5. If `lo` is 0, nothing was written yet: return `""`. Otherwise return the value at `lo - 1`.

### Dry run: love has (10, high) and (20, low); get at 15

| lo | hi | mid | list[mid] time | action |
|---|---|---|---|---|
| 0 | 2 | 1 | 20 | 20 > 15, so hi = 1 |
| 0 | 1 | 0 | 10 | 10 <= 15, so lo = 1 |
| 1 | 1 | | | stop: answer is list[0] = high |

### Edge cases

- Unknown key: return `""` before searching.
- Query earlier than the first write: the search ends with `lo = 0`, so return `""`.
- Query equal to a stored timestamp: `<=` includes it, so that exact write is returned.

### Common mistakes

- Using `===` and returning `""` whenever the exact timestamp is missing. The question is "at or before".
- Searching for the first timestamp `>= t` and returning it, which returns a value from the **future**.
- Sorting on every `get`. The data is already sorted; appending preserves that.

### Other ways to solve it

A `Map` per key from timestamp to value gives O(1) exact lookups but no "nearest earlier" query. A balanced tree (floor lookup) would give O(log n) for both operations, but JavaScript has none built in; a sorted array with binary search is the practical choice.
