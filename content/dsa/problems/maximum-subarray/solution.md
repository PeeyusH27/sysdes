### Intuition

There are about n²/2 subarrays, so checking them all is O(n²). Instead, ask a narrower question at every index: **what is the best sum of a subarray that ends exactly at `i`?**

Such a subarray is either `nums[i]` alone, or it is a subarray ending at `i - 1` with `nums[i]` added on. If you extend, you should extend the best one, so:

`endingHere(i) = Math.max(nums[i], endingHere(i - 1) + nums[i])`

In words: if the best run ending just before `i` has a negative sum, it can only hurt, so drop it and start fresh at `i`. The answer is the best `endingHere` seen at any index, because the best subarray can end anywhere. This is **Kadane's algorithm**: an "ending at `i`" DP where each cell reads only the cell before it.

### Step by step

1. **State**: `endingHere[i]` = the largest sum of a subarray whose last element is `nums[i]`.
2. **Recurrence**: `endingHere[i] = Math.max(nums[i], endingHere[i - 1] + nums[i])`.
3. **Base case**: `endingHere[0] = nums[0]`.
4. **Order**: left to right.
5. **Answer**: the maximum of `endingHere` over all indices (not just the last one).
6. **Space**: only the previous cell is read, so keep two variables:
   1. `endingHere = nums[0]`, `best = nums[0]`.
   2. For `i` from 1: `endingHere = Math.max(nums[i], endingHere + nums[i])`, then `best = Math.max(best, endingHere)`.
   3. Return `best`.

### Dry run: `[3, -4, 5, -1, 2, -6, 4]`

| i | nums[i] | extend: endingHere + nums[i] | endingHere | best |
|---|---|---|---|---|
| 0 | 3 | (start) | 3 | 3 |
| 1 | -4 | 3 - 4 = -1 | max(-4, -1) = -1 | 3 |
| 2 | 5 | -1 + 5 = 4 | max(5, 4) = **5**, start fresh | 5 |
| 3 | -1 | 5 - 1 = 4 | 4 | 5 |
| 4 | 2 | 4 + 2 = 6 | 6 | 6 |
| 5 | -6 | 6 - 6 = 0 | 0 | 6 |
| 6 | 4 | 0 + 4 = 4 | max(4, 4) = 4 | **6** |

### Why it works

Every subarray has a last index. For that last index `i`, the best subarray ending there either has length 1, or it is `nums[i]` added to some subarray ending at `i - 1`, and using the best of those can only help. So `endingHere` is exactly right at every index, and the overall best is the largest of them.

### Edge cases

- All negative, like `[-3, -1, -2]`: the answer is the largest single number, -1. Starting `best` at 0 would wrongly return 0, the sum of an empty subarray, which isn't allowed.
- A single element: the loop doesn't run and `nums[0]` is returned.
- Zeros: `[0, -3, 0]` gives 0, from either zero alone.

### Common mistakes

- Initialising `best` (or `endingHere`) to `0` instead of `nums[0]`: fails every all-negative input.
- Resetting with `if (endingHere < 0) endingHere = 0` **before** updating `best`, which can also report 0 for all-negative arrays.
- Returning `endingHere` at the end: that is the best run ending at the **last** index, not the best overall.

### Other ways to solve it

- **Prefix sums** (O(n) time, O(1) space): the sum of `nums[j..i]` is `prefix[i + 1] - prefix[j]`. Walk once, keeping the smallest prefix seen so far; the best answer at `i` is the current prefix minus that minimum. It is the same algorithm in another form.
- **Divide and conquer** (O(n log n)): the best subarray is in the left half, the right half, or crosses the middle. A classic follow-up, but slower.
