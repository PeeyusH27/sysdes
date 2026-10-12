### Intuition

Choosing where to cut directly is hard: there are many ways to place `k - 1` cuts. Flip the question around and it becomes easy:

> Given a limit `L`, can the array be cut into at most `k` pieces whose sums are all `<= L`?

That question has a simple greedy answer. Walk left to right, adding numbers to the current piece, and only start a new piece when the next number would push the sum over `L`. Packing each piece as full as possible can never use more pieces than any other valid way of cutting (each greedy piece ends at least as far right as the matching piece of any other split). So if greedy needs more than `k` pieces, nothing can do it with `k`.

And the answers are **monotonic**: if limit `L` is achievable, any bigger limit is achievable too. So "is `L` achievable?" goes `no, no, …, yes, yes` as `L` grows, and the answer is the first `yes`. Binary search on `L`.

The range of `L` is easy to bound:
- `lo = max(nums)`: some piece contains the biggest element, so no limit below it can work.
- `hi = sum(nums)`: one piece containing everything always fits.

Why "at most `k`" is enough when the problem says "exactly `k`": the numbers are non-negative, so splitting a piece in two never makes any sum bigger. A split with fewer pieces can always be refined into exactly `k` (there are at least `k` elements) without raising the cost.

### Step by step

1. Write `piecesNeeded(limit)`:
   1. Start with `pieces = 1` and `sum = 0`.
   2. For each `x`: if `sum + x > limit`, start a new piece (`pieces++`, `sum = 0`). Then add `x` to `sum`.
   3. Return `pieces`.
2. Set `lo = Math.max(...nums)` and `hi` to the total sum.
3. While `lo < hi`:
   1. `mid = Math.floor((lo + hi) / 2)`.
   2. If `piecesNeeded(mid) <= k`, `mid` is achievable: `hi = mid`.
   3. Otherwise it needs too many pieces: `lo = mid + 1`.
4. Return `lo`.

### Dry run: `nums = [6, 3, 8, 2, 5]`, `k = 2`

The range starts at `lo = 8` (largest element) and `hi = 24` (total).

| lo | hi | mid | greedy pieces with limit mid | count | decision |
|---|---|---|---|---|---|
| 8 | 24 | 16 | [6, 3] [8, 2, 5] | 2 | fits: `hi = 16` |
| 8 | 16 | 12 | [6, 3] [8, 2] [5] | 3 | too many: `lo = 13` |
| 13 | 16 | 14 | [6, 3] [8, 2] [5] | 3 | too many: `lo = 15` |
| 15 | 16 | 15 | [6, 3] [8, 2, 5] | 2 | fits: `hi = 15` |
| 15 | 15 | | | | **return 15** |

### Edge cases

- `k === nums.length`: each element is its own piece, and the answer is `max(nums)` (the search starts and ends there).
- `k === 1`: the answer is the total sum.
- Zeros: they never force a new piece, since adding 0 can't exceed a limit the sum already met.

### Common mistakes

- Starting `lo` below `max(nums)`. `piecesNeeded` then puts an element bigger than the limit into a piece of its own without noticing that it doesn't fit, so for `[0, 9]` with `k = 2` the limit 1 looks achievable.
- Resetting `sum = 0` without adding `x` to the new piece, so the element that caused the cut is lost.
- Testing `piecesNeeded(mid) === k` instead of `<= k`. A limit that needs fewer pieces is still achievable (split any piece further), so `===` throws away valid limits and can miss the answer.

### Other ways to solve it

Dynamic programming: let `dp[j][i]` be the best cost for splitting the first `i` elements into `j` pieces, trying every position for the last cut: `dp[j][i] = min over m of max(dp[j-1][m], sum(m..i-1))`. That takes O(k · n²) time, fine for these limits but much slower than the O(n log S) binary search, where `S` is the total sum.
