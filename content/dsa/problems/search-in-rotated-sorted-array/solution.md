### Intuition

In a normal binary search, `nums[mid] < target` tells you the target is to the right. After a rotation that's no longer true: in `[5, 7, 9, 1, 2, 4]`, the middle value 9 is bigger than the target 2, yet 2 is to the **right**.

The rescue: a rotated array is two sorted runs glued together, so wherever you cut it at `mid`, **at least one of the two halves is sorted normally**.

- If `nums[lo] <= nums[mid]`, the left half `nums[lo..mid]` contains no "drop", so it is sorted.
- Otherwise the drop is inside the left half, which means the right half `nums[mid..hi]` is sorted.

For a sorted half you can check membership exactly with its two end values: the target is inside `nums[lo..mid]` only if `nums[lo] <= target < nums[mid]`. If it's in there, search that half; if not, it can only be in the other half. Either way, half the range is discarded per step, just like ordinary binary search.

### Step by step

1. Set `lo = 0`, `hi = nums.length - 1` (inclusive range: if the target exists, it is inside).
2. While `lo <= hi`:
   1. `mid = Math.floor((lo + hi) / 2)`. If `nums[mid] === target`, return `mid`.
   2. If `nums[lo] <= nums[mid]`, the left half is sorted:
      - if `nums[lo] <= target < nums[mid]`, the target can only be on the left: `hi = mid - 1`;
      - otherwise it can only be on the right: `lo = mid + 1`.
   3. Otherwise the right half is sorted:
      - if `nums[mid] < target <= nums[hi]`, go right: `lo = mid + 1`;
      - otherwise go left: `hi = mid - 1`.
3. Return `-1`.

### Dry run: `nums = [6, 8, 10, 12, 2]`, `target = 2`

| lo | hi | mid | nums[mid] | sorted half | target inside it? | decision |
|---|---|---|---|---|---|---|
| 0 | 4 | 2 | 10 | left: 6…10 | 6 ≤ 2? no | `lo = 3` |
| 3 | 4 | 3 | 12 | left: just 12 (`lo === mid`) | 12 ≤ 2? no | `lo = 4` |
| 4 | 4 | 4 | 2 | | | equal: **return 4** |

The second row is why the test is `nums[lo] <= nums[mid]` and not `<`: when `lo === mid`, the left half is a single element, which is trivially sorted.

### Why it works

The invariant is the same as in plain binary search: *if the target exists, it is in `nums[lo..hi]`.* In the sorted half, the range test is exact, so when it says "not here" the target really can't be in that half; then it can only be in the other half. Every step drops `mid` plus one half, so the loop finishes in O(log n) steps.

### Common mistakes

- Comparing only `nums[mid]` with `target`, as in normal binary search. The rotation breaks that rule.
- Using `nums[lo] < nums[mid]`. With two elements left (`[4, 1]`, target 1), `lo === mid`, the test fails, the code treats the right half as sorted, checks `4 < 1`, and wrongly moves left.
- Making the range checks too strict: `nums[lo] < target` misses a target sitting exactly at `nums[lo]`, and `target < nums[hi]` misses one at `nums[hi]`.

### Other ways to solve it

Find the rotation point first: the index of the minimum, using a binary search that compares `nums[mid]` with `nums[hi]` (if `nums[mid] > nums[hi]` the minimum is right of `mid`, otherwise it's at `mid` or to its left). Then run a normal binary search on whichever sorted run can contain the target. Two O(log n) passes, and each one is simpler to get right.
