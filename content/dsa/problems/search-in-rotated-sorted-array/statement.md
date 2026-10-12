An array of **distinct** integers was sorted in ascending order and then **rotated**: some number of elements were taken off the front and appended to the back, keeping their order. For example, `[1, 2, 4, 5, 7, 9]` rotated by three positions becomes `[5, 7, 9, 1, 2, 4]`. The rotation may also be zero, leaving the array fully sorted.

Given the rotated array `nums` and an integer `target`, return the index of `target` in `nums`, or `-1` if it is not there.

Your solution must run in **O(log n)** time. You don't know how far the array was rotated.

### Constraints

- `1 <= nums.length <= 5000`
- `-10^4 <= nums[i], target <= 10^4`
- All values in `nums` are distinct.
- `nums` is an ascending array rotated by an unknown amount (possibly zero).
