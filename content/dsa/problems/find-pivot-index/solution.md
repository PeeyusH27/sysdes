### Intuition

The brute force adds up both sides from scratch for every index: O(n²). But both sums change by very little from one index to the next. Keep a **running sum** of the left side, and get the right side by subtraction:

`rightSum = total - leftSum - nums[i]`

`total` is computed once. Then each index costs O(1).

### Step by step

1. Compute `total`, the sum of the whole array.
2. Set `leftSum = 0`: nothing is left of index 0.
3. For each `i` from left to right:
   1. Compute `rightSum = total - leftSum - nums[i]`.
   2. If `leftSum === rightSum`, return `i`. Scanning left to right means the first hit is the leftmost pivot.
   3. Add `nums[i]` to `leftSum` **after** the check, so it counts for the next index.
4. Return `-1`.

### Dry run: `nums = [2, 3, -1, 8, 4]`

`total = 16`.

| i | nums[i] | leftSum | rightSum = 16 - leftSum - nums[i] | pivot? |
|---|---|---|---|---|
| 0 | 2 | 0 | 14 | no |
| 1 | 3 | 2 | 11 | no |
| 2 | -1 | 5 | 12 | no |
| 3 | 8 | 4 | 4 | **yes → 3** |

### Edge cases

- A single element is always a pivot: both sides are empty, so `0 === 0`.
- `[0, 0, 0]`: every index is a pivot; return the leftmost, `0`.
- Negative values are fine: the sums are exact, nothing assumes the values are positive.

### Common mistakes

- Including `nums[i]` in `leftSum` or `rightSum`: the pivot's own value belongs to neither side.
- Adding `nums[i]` to `leftSum` **before** the comparison, which shifts every check by one index.
- Walking two pointers from both ends toward a "balance point": with negative numbers, neither side's sum moves predictably, so that search can skip the pivot.
