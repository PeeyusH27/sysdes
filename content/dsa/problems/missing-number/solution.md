### Intuition

Put every number of the full range `0 … n` next to every value in `nums`. Each number that is present now appears **twice**, and the missing one appears **once**. That is exactly the setting of Single Number: XOR everything together, the pairs cancel, and the missing number is left.

You don't need a second loop for the range. The indices `0 … n - 1` of the array already give you all of the range except `n`, so start the result at `n` and XOR in each index together with each value.

### Step by step

1. Set `result = n` (that is, `nums.length`).
2. For each index `i` from `0` to `n - 1`: `result ^= i ^ nums[i]`.
3. Return `result`.

### Dry run: `[4, 0, 1, 3]`

`n = 4`, so the range is 0 to 4.

| i | nums[i] | result ^ i ^ nums[i] | result |
|---|---|---|---|
| start | | | 4 |
| 0 | 4 | 4 ^ 0 ^ 4 | 0 |
| 1 | 0 | 0 ^ 1 ^ 0 | 1 |
| 2 | 1 | 1 ^ 2 ^ 1 | 2 |
| 3 | 3 | 2 ^ 3 ^ 3 | **2** |

The 4 (start and `nums[0]`), 0, 1 and 3 each appeared twice and cancelled; 2 appeared only as an index.

### Edge cases

- The missing number is `n` itself: `[0, 1, 2]` returns 3. Starting with `result = n` is what covers this.
- The missing number is 0: `[1]` returns 0.

### Common mistakes

- Starting with `result = 0`: the value `n` is never XOR-ed in as a range number, so `[0, 1, 2]` returns 0 instead of 3.
- Sorting and looking for the first `nums[i] !== i`, but forgetting that when every index matches, the answer is `n`.
- Assuming the array is sorted. It isn't.

### Other ways to solve it

- **Sum formula**: `n * (n + 1) / 2` minus the sum of the array. In JavaScript the numbers here are far below 2^53, so there is no overflow to worry about.
- A `Set` of the values, then check `0 … n`: O(n) time but O(n) space.
