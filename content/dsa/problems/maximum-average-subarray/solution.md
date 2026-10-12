### Intuition

Every candidate has the same length `k`, so the subarray with the largest **average** is simply the one with the largest **sum**. Divide once at the end.

The brute force adds up each window from scratch: n - k + 1 windows of k numbers, O(n · k). But two neighbouring windows share k - 1 numbers. Sliding one step to the right only changes two things: `nums[right]` **enters** and `nums[right - k]` **leaves**. So each new window's sum costs O(1) to compute from the previous one.

### Step by step

1. Add up the first `k` values: that's the sum of the window ending at index `k - 1`. Set `best` to it.
2. For each `right` from `k` to `nums.length - 1`:
   1. Update `sum += nums[right] - nums[right - k]`.
   2. Update `best = Math.max(best, sum)`.
3. Return `best / k`.

### Dry run: `nums = [4, 0, 6, -2, 9, 1]`, `k = 3`

| right | enters | leaves | window | sum | best |
|---|---|---|---|---|---|
| start | | | [4, 0, 6] | 10 | 10 |
| 3 | -2 | 4 | [0, 6, -2] | 4 | 10 |
| 4 | 9 | 0 | [6, -2, 9] | 13 | 13 |
| 5 | 1 | 6 | [-2, 9, 1] | 8 | 13 |

Answer: `13 / 3 ≈ 4.33333`.

### Edge cases

- `k === nums.length`: the loop never runs, and the answer is the average of the whole array.
- All values negative: the answer is negative, so `best` must start from a real window, not from 0.
- `k === 1`: the answer is the largest single value.

### Common mistakes

- Starting with `best = 0`. With `[-1, -2, -3]` and `k = 2` that returns 0 instead of -1.5. Start from the first window's sum (or `-Infinity`).
- Subtracting the wrong element. The new window is `right - k + 1 … right`, so the one that just left is `nums[right - k]`.
- Rounding the result with `Math.floor` or `toFixed`: return the plain division, which is already a decimal in JavaScript.
