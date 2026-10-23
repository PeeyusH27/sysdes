### Intuition

Scanning for the minimum is O(n). The array is *almost* sorted, which is enough for binary search. A rotated array is two ascending runs: a larger run on the left and a smaller run on the right, with a single "drop" between them. The minimum is the first element after that drop (or `nums[0]` if there is no drop).

The question to ask at each step is: **which run is `mid` in?** Compare it with the last element of the current range:

- `nums[mid] > nums[right]`: `mid` is in the big left run, because in a sorted stretch it would be smaller than the right end. The drop is strictly to the right of `mid`.
- `nums[mid] < nums[right]`: `mid` and everything up to `right` form one sorted stretch, so the minimum is at `mid` or to its left.

### Step by step

1. Set `left = 0` and `right = nums.length - 1`.
2. While `left < right`:
   1. `mid = (left + right) >> 1`.
   2. If `nums[mid] > nums[right]`, set `left = mid + 1`.
   3. Otherwise set `right = mid`.
3. The range has shrunk to one index. Return `nums[left]`.

### Dry run: `[4, 5, 6, 7, 0, 1, 2]`

| left | right | mid | nums[mid] vs nums[right] | action |
|---|---|---|---|---|
| 0 | 6 | 3 | 7 > 2 | left = 4 |
| 4 | 6 | 5 | 1 < 2 | right = 5 |
| 4 | 5 | 4 | 0 < 1 | right = 4 |
| 4 | 4 | | | stop, answer `nums[4] = 0` |

### Why it works

The loop keeps the invariant "the minimum lies in `[left, right]`". When `nums[mid] > nums[right]` the minimum cannot be at or left of `mid`, so discarding up to `mid` is safe. In the other case the minimum is at `mid` or before it, so discarding everything after `mid` is safe, but `mid` itself must stay. Each step removes at least one index, so the loop ends, and it halves the range, so it takes O(log n) steps.

### Edge cases

- Already sorted: `nums[mid] < nums[right]` every time, `right` shrinks to 0, the answer is `nums[0]`.
- Two elements `[2, 1]`: `mid = 0`, `2 > 1` so `left = 1`. Without distinct values, `nums[mid] === nums[right]` would be ambiguous.

### Common mistakes

- Comparing `nums[mid]` with `nums[left]` instead of `nums[right]`: this is ambiguous when the array is not rotated at all.
- Writing `right = mid - 1`, which can discard the minimum itself.
- Looping with `left <= right`, which never terminates once `right = mid` keeps the range unchanged.
