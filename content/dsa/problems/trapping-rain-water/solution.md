### Intuition

Look at a single index `i`. Water above it rises until it spills over the lower of the two walls around it:

`water[i] = min(maxLeft(i), maxRight(i)) - height[i]`

where `maxLeft(i)` is the tallest bar at or left of `i`, and `maxRight(i)` the tallest at or right of `i`. Summing that for every `i` is the answer. Two arrays of prefix and suffix maxima give an O(n)-space solution; two pointers remove the arrays.

**The two-pointer insight.** Keep `leftMax` (tallest bar seen from the left so far) and `rightMax` (tallest seen from the right). If `leftMax < rightMax`, then for the `left` index the bottleneck is definitely `leftMax`: the real `maxRight(left)` is at least `rightMax`, which is already bigger. So the water above `left` is exactly `leftMax - height[left]`, and we can settle it and move on. The mirror argument settles `right` when `rightMax <= leftMax`.

### Step by step

1. `left = 0`, `right = n - 1`, `leftMax = 0`, `rightMax = 0`, `water = 0`.
2. While `left <= right`:
   1. Update `leftMax = max(leftMax, height[left])` and `rightMax = max(rightMax, height[right])`.
   2. If `leftMax < rightMax`: add `leftMax - height[left]` to `water`, then `left++`.
   3. Otherwise: add `rightMax - height[right]` to `water`, then `right--`.
3. Return `water`.

Updating the max **before** adding means the current bar counts as its own wall, so the added amount is never negative.

### Dry run: `[4, 2, 0, 3, 2, 5]`

| left | right | leftMax | rightMax | settle | water |
|---|---|---|---|---|---|
| 0 (4) | 5 (5) | 4 | 5 | left: 4 - 4 = 0 | 0 |
| 1 (2) | 5 (5) | 4 | 5 | left: 4 - 2 = 2 | 2 |
| 2 (0) | 5 (5) | 4 | 5 | left: 4 - 0 = 4 | 6 |
| 3 (3) | 5 (5) | 4 | 5 | left: 4 - 3 = 1 | 7 |
| 4 (2) | 5 (5) | 4 | 5 | left: 4 - 2 = 2 | 9 |
| 5 (5) | 5 (5) | 5 | 5 | right: 5 - 5 = 0 | 9 |

### Other ways to solve it

- **Prefix/suffix maxima** (O(n) time, O(n) space): build `maxLeft[]` and `maxRight[]`, then sum the formula. Easiest to get right in an interview.
- **Monotonic stack** (O(n) time and space): pop bars that are lower than the current one and add the water bounded between the new wall and the bar below the popped one. It fills water layer by layer horizontally.

### Common mistakes

- Using `max(maxLeft, maxRight)`: water spills over the **lower** wall.
- Adding water before updating the running max, which can add negative amounts.
