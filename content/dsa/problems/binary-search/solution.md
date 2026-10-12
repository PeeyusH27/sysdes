### Intuition

Scanning from the left checks every element: O(n). The array is sorted, so you can do far better. Compare the target with the **middle** element:

- If the middle value is too small, then so is every value to its left. That whole half can't contain the target.
- If the middle value is too big, every value to its right is too big as well.

One comparison throws away half of what's left. After about log₂(n) comparisons nothing is left to search: 14 comparisons are enough for 10,000 elements.

Keep the search space as an inclusive range `[lo, hi]` and hold on to one sentence, the **invariant**: *if the target is in the array at all, it is somewhere in `nums[lo..hi]`.* Every update must keep that sentence true.

### Step by step

1. Set `lo = 0` and `hi = nums.length - 1`: at the start the whole array is in play.
2. While `lo <= hi` (the range is not empty):
   1. Take the middle index `mid = Math.floor((lo + hi) / 2)`.
   2. If `nums[mid] === target`, return `mid`.
   3. If `nums[mid] < target`, then `mid` and everything before it are too small: set `lo = mid + 1`.
   4. Otherwise `mid` and everything after it are too big: set `hi = mid - 1`.
3. The range is empty, so by the invariant the target isn't in the array: return `-1`.

### Dry run: `nums = [-4, 1, 3, 7, 10, 15]`

Looking for `target = 7`:

| lo | hi | mid | nums[mid] | decision |
|---|---|---|---|---|
| 0 | 5 | 2 | 3 | 3 < 7: drop indices 0–2, `lo = 3` |
| 3 | 5 | 4 | 10 | 10 > 7: drop indices 4–5, `hi = 3` |
| 3 | 3 | 3 | 7 | equal: **return 3** |

Looking for `target = 2`, which is missing:

| lo | hi | mid | nums[mid] | decision |
|---|---|---|---|---|
| 0 | 5 | 2 | 3 | 3 > 2: `hi = 1` |
| 0 | 1 | 0 | -4 | -4 < 2: `lo = 1` |
| 1 | 1 | 1 | 1 | 1 < 2: `lo = 2` |
| 2 | 1 | | | `lo > hi`: the range is empty, **return -1** |

### Why it works

The invariant holds at the start (the range is the whole array) and every update keeps it: we only drop indices whose values we have **proved** are too small or too big. Each pass also removes at least one index (`mid` itself), so the loop always ends. It ends either by returning the target's index or with an empty range, and an empty range plus the invariant means the target was never there.

### Common mistakes

- Looping `while (lo < hi)` with `hi = nums.length - 1`: the loop stops while one element is still unchecked, so `search([6], 6)` returns `-1`.
- Writing `lo = mid` or `hi = mid` in this inclusive version. With `lo = 0` and `hi = 1`, `mid` is 0, and `lo = mid` never moves: an infinite loop.
- Forgetting to round: `(lo + hi) / 2` can be `2.5`, and `nums[2.5]` is `undefined`.
- Using `(lo + hi) >> 1` everywhere. It works for array indices, but `>>` converts to a 32-bit integer, so it breaks when you binary search over large **values** (above about 2.1 billion). `Math.floor((lo + hi) / 2)` is always safe in JavaScript.
