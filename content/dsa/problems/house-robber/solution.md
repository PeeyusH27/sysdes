### Intuition

Trying every allowed set of houses is exponential, and simple rules fail: "take every other house" misses `[2, 1, 1, 2]`, where the best is the first and the last house (4).

Decide **one house at a time**, from left to right. At house `i` there are only two choices:

- **Skip it.** Then the best total is whatever was best for the houses before it.
- **Rob it.** Then house `i - 1` must be untouched, so the total is the best for the houses up to `i - 2`, plus `nums[i]`.

Whatever happened further left only matters through those two numbers, which is exactly what DP needs.

### Step by step

1. **State**: `best[i]` = the most cash you can take from the first `i` houses (houses `0` to `i - 1`).
2. **Recurrence**: `best[i] = Math.max(best[i - 1], best[i - 2] + nums[i - 1])`: skip house `i - 1`, or rob it and fall back two.
3. **Base cases**: `best[0] = 0` (no houses, no cash) and `best[1] = nums[0]` (one house: rob it). The recurrence takes over from `i = 2`.
4. **Order**: left to right, so both values each house reads are ready.
5. **Answer**: `best[n]`, the best over all the houses.
6. **Space**: each step reads only the previous two values, so keep two variables:
   1. `twoBack = 0`, `oneBack = 0`. Starting both at 0 makes the first house come out as `Math.max(0, 0 + nums[0]) = nums[0]`, so no special case is needed.
   2. For each `cash` in `nums`: `best = Math.max(oneBack, twoBack + cash)`, then `twoBack = oneBack` and `oneBack = best`.
   3. Return `oneBack`.

### Dry run: `[4, 1, 2, 7, 5, 3, 1]`

| house | cash | skip it (`oneBack`) | rob it (`twoBack + cash`) | new `oneBack` |
|---|---|---|---|---|
| 0 | 4 | 0 | 0 + 4 = 4 | 4 |
| 1 | 1 | 4 | 0 + 1 = 1 | 4 |
| 2 | 2 | 4 | 4 + 2 = 6 | 6 |
| 3 | 7 | 6 | 4 + 7 = 11 | 11 |
| 4 | 5 | 11 | 6 + 5 = 11 | 11 |
| 5 | 3 | 11 | 11 + 3 = 14 | 14 |
| 6 | 1 | 14 | 11 + 1 = 12 | **14** |

### Why it works

The best plan for the first `i` houses either uses house `i - 1` or it doesn't. If it doesn't, it is a plan for the first `i - 1` houses, and the best such plan is `best[i - 1]`. If it does, house `i - 2` is excluded, and the rest is a plan for the first `i - 2` houses: the best is `best[i - 2]`. Taking the larger of the two covers every possible plan.

### Edge cases

- One house: rob it. The loop runs once and returns `nums[0]`.
- All zeros: the answer is 0, and the `max` never prefers a negative value because cash is never negative.
- Several skips in a row are allowed: in `[6, 2, 1, 8]` the best plan skips houses 1 and 2.

### Common mistakes

- Comparing only "all even indices" against "all odd indices": it misses plans that skip two houses in a row.
- Writing `twoBack = oneBack` **after** `oneBack = best`, which makes both variables the same value.
- Indexing with `nums[i]` while `best[i]` means "the first `i` houses" (or the other way round): pick one meaning for the index and stick to it.
- Plain recursion without a memo: correct, but it repeats the same suffixes and takes exponential time and times out on the 60-house test.
