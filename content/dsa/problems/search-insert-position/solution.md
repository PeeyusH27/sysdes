### Intuition

"Where is it?" and "where would it go?" are the same question: **what is the first index whose value is greater than or equal to the target?**

- If the target is present, that first index holds the target itself.
- If it is missing, that first index holds the next bigger value, which is exactly where the target would be inserted (the bigger values shift right).
- If every value is smaller, there is no such index and the answer is `nums.length`.

Picture the test `nums[i] >= target` for every index. Because the array is sorted, the results look like `false, false, …, true, true`: they flip from false to true **once**. We are looking for the first `true`. This is the **lower bound** search, and it is the most reusable binary search template there is.

The invariant: *the answer is always inside `[lo, hi]`.* Since the answer may be `nums.length`, `hi` starts at `nums.length`, not `nums.length - 1`.

### Step by step

1. Set `lo = 0` and `hi = nums.length`.
2. While `lo < hi` (there are at least two candidates):
   1. `mid = Math.floor((lo + hi) / 2)`. Because we round down and `lo < hi`, `mid` is always a real index below `hi`.
   2. If `nums[mid] < target`, `mid` is too small and so is everything before it: `lo = mid + 1`.
   3. Otherwise `nums[mid] >= target`, so `mid` **could be** the answer. Keep it in range: `hi = mid` (not `mid - 1`).
3. Now `lo === hi`: one candidate is left and the invariant says it is the answer. Return `lo`.

### Dry run: `nums = [1, 4, 6, 9]`, `target = 5`

| lo | hi | mid | nums[mid] | nums[mid] < 5? | decision |
|---|---|---|---|---|---|
| 0 | 4 | 2 | 6 | no | `hi = 2` (6 might be the first value ≥ 5) |
| 0 | 2 | 1 | 4 | yes | `lo = 2` |
| 2 | 2 | | | | one candidate left: **return 2** |

With `target = 12`, every comparison says "too small", `lo` climbs to 4 and the answer is `nums.length`.

### Why it terminates

When `lo < hi`, rounding down gives `lo <= mid < hi`. So `lo = mid + 1` strictly raises `lo`, and `hi = mid` strictly lowers `hi`. The range shrinks on every step and the loop ends with `lo === hi`.

### Common mistakes

- Starting with `hi = nums.length - 1`: the search can never return `nums.length`, so a target bigger than everything gets the wrong answer.
- Writing `hi = mid - 1` in this template: if `mid` was the answer you just threw it away.
- Rounding up (`Math.ceil`) while using `hi = mid`: with `lo = 0` and `hi = 1`, `mid` becomes 1, `hi = mid` changes nothing, and the loop spins forever.

### Other ways to solve it

The classic `while (lo <= hi)` search also works: if it finishes without finding the target, `lo` has stopped at the insert position. The lower bound version is worth learning instead because the same loop answers "first position", "last position" and "smallest value that works" questions.
