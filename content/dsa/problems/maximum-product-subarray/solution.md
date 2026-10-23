### Intuition

For the maximum subarray **sum** you extend or restart at each element. A product behaves differently because of signs: multiplying a very negative product by a negative number makes it very positive. So the best product ending at a position could come from the **smallest** product ending just before it.

Keep two values for subarrays that end at the current index: the largest product (`max`) and the smallest product (`min`). With a new number `x`, the candidates for both are:

- `x` itself (start a new subarray here),
- `max * x`,
- `min * x`.

The new `max` is the biggest candidate and the new `min` the smallest. A zero collapses both to 0, and the "start fresh at `x`" candidate restarts cleanly at the next element. The answer is the largest `max` seen.

### Step by step

1. Set `max = min = best = nums[0]`.
2. For each later `x`:
   1. Compute `a = max * x` and `b = min * x` from the *old* `max` and `min`.
   2. `max = Math.max(x, a, b)` and `min = Math.min(x, a, b)`.
   3. `best = Math.max(best, max)`.
3. Return `best`.

### Dry run: `[-2, 3, -4]`

| x | candidates (x, max·x, min·x) | max | min | best |
|---|---|---|---|---|
| -2 (start) | | -2 | -2 | -2 |
| 3 | 3, -6, -6 | 3 | -6 | 3 |
| -4 | -4, -12, 24 | 24 | -12 | **24** |

The negative `min` of -6 turns into the winning 24 when multiplied by -4.

### Edge cases

- A single element: the answer is that element, even if negative.
- Zeros split the array: `[-2, 0, -1]` has answer `0`.
- An even number of negatives makes the whole array's product positive.

### Common mistakes

- Tracking only the maximum, which misses the flip from negative to positive.
- Updating `max` first and then using the *new* `max` to compute `min`. Save both products before assigning.
- Initializing `best` to 0, which is wrong when every number is negative.

### Other ways to solve it

**Prefix and suffix products**: scan from the left and from the right, resetting the running product to 1 after a zero, and track the largest value seen. O(n) time, O(1) space; it works because any optimal subarray is a prefix or suffix of a zero-free segment.
