### Intuition

A plain binary search finds **some** copy of the target, but not necessarily the first or the last. Walking left and right from it to find the edges is O(n) when the target fills the array (`[5, 5, 5, …, 5]`).

Instead, ask two "first index where…" questions, each answered by its own binary search:

- **first** = the first index with `nums[i] >= target`. If the target exists, this is its first copy.
- **afterLast** = the first index with `nums[i] > target`. This is one past the last copy, so `last = afterLast - 1`.

Both tests are `false` for a prefix of the sorted array and `true` for the rest, which is exactly the shape the "first true" (lower bound) template searches.

### Step by step

1. Write a helper `firstIndex(nums, ok)` that returns the first index whose value passes `ok`, or `nums.length` if none does:
   1. `lo = 0`, `hi = nums.length`.
   2. While `lo < hi`: `mid = Math.floor((lo + hi) / 2)`. If `ok(nums[mid])`, set `hi = mid` (mid might be the first pass). Otherwise set `lo = mid + 1`.
   3. Return `lo`.
2. `first = firstIndex(nums, x => x >= target)`.
3. If `first === nums.length` (everything is smaller) or `nums[first] !== target` (the first value ≥ target is bigger), the target is missing: return `[-1, -1]`.
4. `afterLast = firstIndex(nums, x => x > target)` and return `[first, afterLast - 1]`.

### Dry run: `nums = [2, 4, 4, 4, 7, 9]`, `target = 4`

First search, `ok = x >= 4`:

| lo | hi | mid | nums[mid] | ok? | decision |
|---|---|---|---|---|---|
| 0 | 6 | 3 | 4 | yes | `hi = 3` |
| 0 | 3 | 1 | 4 | yes | `hi = 1` |
| 0 | 1 | 0 | 2 | no | `lo = 1` |
| 1 | 1 | | | | `first = 1` |

Second search, `ok = x > 4`:

| lo | hi | mid | nums[mid] | ok? | decision |
|---|---|---|---|---|---|
| 0 | 6 | 3 | 4 | no | `lo = 4` |
| 4 | 6 | 5 | 9 | yes | `hi = 5` |
| 4 | 5 | 4 | 7 | yes | `hi = 4` |
| 4 | 4 | | | | `afterLast = 4`, so `last = 3` |

Answer: `[1, 3]`.

### Edge cases

- Empty array: the first search returns `0 === nums.length`, so the answer is `[-1, -1]` without reading `nums[0]`.
- Target smaller than everything: `first` is 0 but `nums[0] !== target`.
- Target larger than everything: `first` is `nums.length`.
- One copy: `first === last`.

### Common mistakes

- Finding one copy and then scanning outwards: correct, but O(n) on inputs like `[5, 5, 5, 5, 5]`.
- Forgetting to check `nums[first] === target`: a missing target would return the position where it would be inserted.
- Using `>=` in both searches: both return `first`, so `last` comes out as `first - 1`.

### Other ways to solve it

Because the values are integers, the first index with `nums[i] > target` is the same as the first index with `nums[i] >= target + 1`, so a single `lowerBound(x)` helper can be called twice. That trick breaks for non-integer values; the predicate version above works for anything.
